import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import useAuthStore from '../../store/authStore';
import { io } from 'socket.io-client';
import { Play, Square, Trophy, ChevronRight } from 'lucide-react';

export default function HostSpeedTile() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { token, admin } = useAuthStore();
    const { setSocket, setRoomInfo } = useGameStore();

    // admin 객체에서 PIN 가져오기
    const persistentPin = admin?.pinCode || 'WAIT..';
    const [isConnected, setIsConnected] = useState(false);

    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, level_display, playing, ended, ranking
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentSequence, setCurrentSequence] = useState([]);

    const [participants, setParticipants] = useState([]);
    const [rankingList, setRankingList] = useState([]);

    // 타이머 관련
    const [timeLeft, setTimeLeft] = useState(0);

    const sock = () => window._adminSocket;

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');

        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) {
            window._adminSocket = currentSocket;
        }
        setSocket(currentSocket);

        const setupSocket = (s) => {
            setIsConnected(true);
            s.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '스피드 타일',
                gameType: 'speed_tile',
                gameId: gameId || undefined
            });
        };

        if (currentSocket.connected) {
            setupSocket(currentSocket);
        }

        currentSocket.on('connect', () => setupSocket(currentSocket));
        currentSocket.on('disconnect', () => setIsConnected(false));

        // 참가자 관련 리스너들
        const handleParticipants = (data) => {
            const list = data.participants || Object.values(data);
            setParticipants(list);
        };
        currentSocket.on('online_participants', handleParticipants);

        const handleParticipantUpdate = (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) return prev;
                    return [...prev, data.participant];
                });
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        };
        currentSocket.on('participant_update', handleParticipantUpdate);

        const handleSpeedTileUpdate = (data) => {
            setParticipants(prev => prev.map(p => {
                const pid = p.id || p.participantId;
                if (pid === data.participantId) {
                    return { ...p, ...data };
                }
                return p;
            }));
        };
        currentSocket.on('admin_speed_tile_update', handleSpeedTileUpdate);

        const handleLevelData = (data) => {
            setCurrentLevel(data.level);
            setCurrentSequence(data.sequence);
            setGameStatus('playing');
            setTimeLeft(5);
        };
        currentSocket.on('admin_speed_tile_level', handleLevelData);

        const handleRankingData = (data) => {
            setRankingList(data.ranking);
            setGameStatus('ranking');
        };
        currentSocket.on('admin_ranking_data', handleRankingData);

        return () => {
            // 주석: 여기서 admin_leave_game을 쏘면 페이지 이동 시 참가자들이 튕깁니다.
            // 나가기 버튼을 눌렀을 때만 명시적으로 쏘는 것이 안전합니다.
            currentSocket.off('connect');
            currentSocket.off('disconnect');
            currentSocket.off('online_participants', handleParticipants);
            currentSocket.off('participant_update', handleParticipantUpdate);
            currentSocket.off('admin_speed_tile_update', handleSpeedTileUpdate);
            currentSocket.off('admin_speed_tile_level', handleLevelData);
            currentSocket.off('admin_ranking_data', handleRankingData);
        };
    }, [admin?.pinCode, admin?.id, persistentPin, setRoomInfo, setSocket]);

    // 5초 타이머 카운트다운
    useEffect(() => {
        let timerId;
        if (gameStatus === 'playing' && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerId);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [gameStatus, timeLeft]);

    const startGame = () => {
        console.log('[Host] 게임 시작 버튼 클릭');
        if (!sock() || !isConnected) {
            console.error('[Host] 소켓이 연결되지 않았습니다.', { isConnected, hasSock: !!sock() });
            return;
        }
        sock().emit('admin_start_speed_tile', { pinCode: persistentPin, gameId });

        // 첫 레벨 시작 요청 (약간의 지연을 주어 플레이어들이 game_started를 받을 시간을 확보)
        setTimeout(() => {
            console.log('[Host] 첫 레벨 시작 요청 발송');
            nextLevel(1);
        }, 800);
    };

    const nextLevel = (levelOverride) => {
        if (!sock() || !isConnected) return;
        const level = levelOverride || (currentLevel + 1);
        sock().emit('admin_speed_tile_next_level', { pinCode: persistentPin, level });
    };

    const handleEndGame = () => {
        if (!sock() || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까? 플레이어들은 대기 화면으로 이동합니다.')) {
            sock().emit('admin_end_game', { pinCode: persistentPin, gameId });
            setGameStatus('ended');
            setTimeLeft(0);
        }
    };

    const handleShowRanking = () => {
        if (!sock() || !isConnected) return;
        sock().emit('admin_show_ranking', { pinCode: persistentPin, gameId });
        setGameStatus('ranking');
    };

    if (!persistentPin) return null;

    // 최종 점수 (랭킹) 화면
    if (gameStatus === 'ranking') {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🀄 스피드 타일 최종 결과</h1>
                    <button
                        onClick={() => {
                            if (sock() && isConnected) {
                                sock().emit('admin_leave_game', { pinCode: persistentPin });
                            }
                            navigate('/admin/dashboard');
                        }}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13
                        }}
                    >
                        나가기
                    </button>
                </header>
                <div style={{ display: 'flex', gap: 24, padding: 32, flex: 1 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                        {rankingList.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>결과 데이터가 없습니다.</div>
                        ) : (
                            rankingList.map((p, i) => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, background: i < 3 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}</span>
                                    <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                                    {p.team && <span style={{ fontSize: 11, color: '#c084fc', background: 'rgba(192,132,252,0.12)', padding: '2px 8px', borderRadius: 4 }}>{p.team}팀</span>}
                                    <span style={{ fontWeight: 800, color: '#4ade80', minWidth: 40, textAlign: 'right' }}>{p.score}점</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        🀄 스피드 타일
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.8)', marginTop: 3 }}>
                        {gameStatus === 'waiting' && '게임 시작을 기다리는 중...'}
                        {gameStatus === 'playing' && `레벨 ${currentLevel} 진행 중`}
                        {gameStatus === 'ended' && '게임 종료'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {gameStatus === 'waiting' && (
                        <button
                            onClick={startGame}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#4ade80',
                                padding: '8px 20px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 13,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Play size={16} fill="currentColor" /> 게임 시작
                        </button>
                    )}
                    {gameStatus === 'playing' && (
                        <>
                            <button
                                onClick={() => nextLevel()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#3b82f6',
                                    padding: '8px 20px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <ChevronRight size={16} /> 다음 레벨
                            </button>
                            <button
                                onClick={handleEndGame}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    padding: '8px 20px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Square size={14} fill="currentColor" /> 게임 종료
                            </button>
                        </>
                    )}
                    {(gameStatus === 'ended' || gameStatus === 'ranking') && (
                        <button
                            onClick={handleShowRanking}
                            disabled={gameStatus === 'ranking'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: gameStatus === 'ranking' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.15)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: '#c084fc', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                cursor: gameStatus === 'ranking' ? 'not-allowed' : 'pointer',
                                opacity: gameStatus === 'ranking' ? 0.5 : 1
                            }}
                        >
                            <Trophy size={16} /> 순위 확인
                        </button>
                    )}
                    <button
                        onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            marginLeft: 12
                        }}
                    >
                        나가기
                    </button>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', padding: 32, marginBottom: 24, textAlign: 'center' }}>
                    {gameStatus === 'waiting' && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>상단의 [게임 시작]을 눌러주세요.</p>
                    )}
                    {gameStatus === 'playing' && (
                        <div>
                            <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 800 }}>타겟 타일 순서</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
                                {currentSequence.map((tile, idx) => (
                                    <div key={idx} style={{
                                        width: 80, height: 80, fontSize: 40,
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {tile}
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: timeLeft > 0 ? '#fbbf24' : '#ef4444' }}>
                                ⏳ 남은 시간: {timeLeft}초
                                {timeLeft === 0 && <span style={{ marginLeft: 10 }}>- 시간이 만료되었습니다. [다음 레벨]을 눌러주세요.</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 24, overflowY: 'auto' }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 16px 0', color: 'rgba(255,255,255,0.7)' }}>참가자 현황</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {participants.map(p => (
                            <div key={p.id || p.participantId || p.socketId} style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                                    {p.team || '개인'}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4ff', marginBottom: 8 }}>{p.name || p.nickname}</div>
                                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                                    <span>완료도: <span style={{ color: '#4ade80' }}>{p.correctCount || 0}</span></span>
                                    <span>점수: <span style={{ color: '#fbbf24' }}>{p.score || 0}</span></span>
                                </div>
                            </div>
                        ))}
                        {participants.length === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>접속한 유저가 없습니다...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
