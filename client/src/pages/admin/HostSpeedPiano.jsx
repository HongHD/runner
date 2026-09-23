import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, Trophy, Users, ChevronRight } from 'lucide-react';

export default function HostSpeedPiano() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { token, admin } = useAuthStore();
    const [participants, setParticipants] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, level_display, ended, ranking
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentNotes, setCurrentNotes] = useState([]); // 현재 레벨의 음들
    const [rankingList, setRankingList] = useState([]); // DB 기반 최종 순위
    const [gameStartTime, setGameStartTime] = useState(null);

    // 탭 필터 (전체, 완료, 미완료)
    const [filter, setFilter] = useState('all');

    const persistentPin = admin?.pinCode || 'WAIT..';
    const { setSocket, resetGame, setRoomInfo } = useGameStore();

    const MAX_LEVELS = 10;
    const LEVEL_DURATION = 5000; // 5초

    // 음 정보: { name, korName, color }
    const NOTE_INFO = {
        'C': { korName: '도', color: '#3B82F6' }, // 낮은 도 - 파란색
        'D': { korName: '레', color: '#7C3AED' }, // 보라색
        'E': { korName: '미', color: '#EC4899' }, // 핑크색
        'F': { korName: '파', color: '#F59E0B' }, // 주황색
        'G': { korName: '솔', color: '#10B981' }, // 초록색
        'A': { korName: '라', color: '#0EA5E9' }, // 하늘색
        'B': { korName: '시', color: '#6366F1' }, // 인디고색
        'C_HIGH': { korName: '도', color: '#EF4444' } // 높은 도 - 빨간색
    };

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');

        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) {
            window._adminSocket = currentSocket;
        }
        setSocket(currentSocket);

        currentSocket.on('connect', () => {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '스피드 피아노',
                gameType: 'speed_piano'
            });
        });

        if (currentSocket.connected) {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '스피드 피아노',
                gameType: 'speed_piano'
            });
        }

        currentSocket.on('online_participants', (data) => {
            const list = data.participants || [];
            setParticipants(list.map(p => ({
                ...p,
                correctCount: 0,
                totalAttempts: 0,
                speed: 0,
                score: 0,
                rank: null
            })));
        });

        currentSocket.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) {
                        return prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p);
                    }
                    return [...prev, { ...data.participant, correctCount: 0, totalAttempts: 0, speed: 0, score: 0, rank: null }];
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p =>
                    p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p
                ));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        currentSocket.on('admin_speed_piano_update', (data) => {
            // data: { participantId, correctCount, totalAttempts, speed, score }
            setParticipants(prev => prev.map(p => {
                if (p.id === data.participantId) {
                    return {
                        ...p,
                        correctCount: data.correctCount,
                        totalAttempts: data.totalAttempts,
                        speed: data.speed,
                        score: data.score
                    };
                }
                return p;
            }));
        });

        currentSocket.on('admin_ranking_data', (data) => {
            const list = data.ranking || [];
            setRankingList(list);
            setParticipants(prev => prev.map(p => {
                const match = list.find(r => r.id === p.id);
                return match ? { ...p, rank: match.rank, score: match.score } : p;
            }));
        });

        return () => {
            currentSocket.emit('admin_leave_game', { pinCode: persistentPin });
            currentSocket.off('online_participants');
            currentSocket.off('participant_update');
            currentSocket.off('admin_speed_piano_update');
            currentSocket.off('admin_ranking_data');
            currentSocket.off('connect');
        };
    }, [admin?.pinCode]);

    const sock = () => window._adminSocket;

    const startGame = () => {
        console.log('[Admin] Speed Piano 게임 시작');
        setGameStatus('playing');
        setCurrentLevel(1);
        setGameStartTime(Date.now());

        // 1. 먼저 admin_start_game 전송 (gameTitle 명시적으로 포함)
        sock().emit('admin_start_game', {
            pinCode: persistentPin,
            gameId,
            gameTitle: '스피드 피아노'  // 명시적으로 전송
        });

        // 2. 그 다음 레벨 표시 (플레이어가 game_started를 받은 후)
        setTimeout(() => {
            console.log('[Admin] Level 1 표시');
            displayLevel(1);
        }, 1000);
    };

    const generateNotesForLevel = (level) => {
        // 레벨 1 = 3개, 레벨 2 = 4개, ... 레벨 10 = 10개
        const count = Math.min(level + 2, 10);
        const allNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C_HIGH'];
        const selected = [];

        for (let i = 0; i < count; i++) {
            const note = allNotes[Math.floor(Math.random() * allNotes.length)];
            selected.push(note);
        }
        return selected;
    };

    const displayLevel = (level) => {
        const notes = generateNotesForLevel(level);
        setCurrentLevel(level);
        setCurrentNotes(notes);
        setGameStatus('level_display');

        // 소켓으로 플레이어들에게 음 전송
        sock().emit('admin_speed_piano_level', {
            pinCode: persistentPin,
            level,
            notes,
            gameId
        });
    };

    const nextLevel = () => {
        if (currentLevel < MAX_LEVELS) {
            displayLevel(currentLevel + 1);
        } else {
            endGame();
        }
    };

    const handleEndGame = () => {
        if (!sock() || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까? 플레이어들은 대기 화면으로 이동합니다.')) {
            sock().emit('admin_end_game', { pinCode: persistentPin, gameId });
            setGameStatus('ended');
        }
    };

    const handleShowRanking = () => {
        if (!sock() || !isConnected) return;
        sock().emit('admin_show_ranking', { pinCode: persistentPin, gameId });
        setGameStatus('ranking');
    };

    const filteredParticipants = participants.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'completed') return p.correctCount > 0;
        if (filter === 'incomplete') return p.correctCount === 0;
        return true;
    });

    const sortedParticipants = [...filteredParticipants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalAttempts - b.totalAttempts;
    });

    // 최종 점수 화면
    if (gameStatus === 'ranking' && rankingList.length > 0) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎹 스피드 피아노 최종 결과</h1>
                    <button
                        onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }}
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
                    {/* 개인 순위 */}
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--rvd-cyan, #00d4ff)', marginBottom: 16 }}>📋 개인 순위</h2>
                        {rankingList.map((p, i) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, background: i < 3 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}</span>
                                <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                                {p.team && <span style={{ fontSize: 11, color: '#c084fc', background: 'rgba(192,132,252,0.12)', padding: '2px 8px', borderRadius: 4 }}>{p.team}팀</span>}
                                <span style={{ fontWeight: 800, color: '#4ade80', minWidth: 40, textAlign: 'right' }}>{p.score}점</span>
                            </div>
                        ))}
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
                        🎹 스피드 피아노
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.8)', marginTop: 3 }}>
                        {gameStatus === 'waiting' && '게임 시작을 기다리는 중...'}
                        {gameStatus === 'level_display' && `레벨 ${currentLevel} / ${MAX_LEVELS}`}
                        {gameStatus === 'playing' && '게임 진행 중'}
                        {gameStatus === 'ended' && '게임 종료'}
                        {gameStatus === 'ranking' && '게임 결과'}
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
                    {(gameStatus === 'level_display' || gameStatus === 'playing') && (
                        <>
                            <button
                                onClick={nextLevel}
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
                            fontSize: 13
                        }}
                    >
                        나가기
                    </button>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <div style={{ display: 'flex', gap: 24, padding: '24px', flex: 1 }}>
                {/* 왼쪽: 현재 음 표시 */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {gameStatus === 'waiting' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>🎹 스피드 피아노</h2>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
                                관리자 화면에서 나오는 음을<br />
                                가장 빠르게 정확하게 눌러보세요!
                            </p>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                                <p>📊 참가 인원: {participants.length}명</p>
                                <p>🎯 총 {MAX_LEVELS}개 레벨</p>
                            </div>
                        </div>
                    )}
                    {gameStatus === 'level_display' && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>레벨 {currentLevel} - 음을 순서대로 누르세요</p>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
                                {currentNotes.map((note, idx) => {
                                    const info = NOTE_INFO[note];
                                    const isHighC = note === 'C_HIGH';
                                    const displayColor = info.color;
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                background: displayColor,
                                                color: '#fff',
                                                padding: '12px 20px',
                                                borderRadius: 8,
                                                fontWeight: 800,
                                                fontSize: 16,
                                                minWidth: 50,
                                                textAlign: 'center'
                                            }}
                                        >
                                            {info.korName}
                                        </div>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>자동으로 다음 레벨로 진행됩니다...</p>
                        </div>
                    )}
                    {gameStatus === 'ended' && (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>🏆 게임 종료</h2>
                            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>점수 집계 중...</p>
                        </div>
                    )}
                </div>

                {/* 오른쪽: 참가자 목록 */}
                <div style={{ width: 340, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {['all', 'completed', 'incomplete'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: filter === f ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {f === 'all' && `전체 (${participants.length})`}
                                {f === 'completed' && `완료 (${participants.filter(p => p.correctCount > 0).length})`}
                                {f === 'incomplete' && `미완료 (${participants.filter(p => p.correctCount === 0).length})`}
                            </button>
                        ))}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {sortedParticipants.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingTop: 40 }}>아직 참가자가 없습니다</div>
                        ) : (
                            sortedParticipants.map((p, idx) => (
                                <div key={p.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>
                                            {p.rank ? `${p.rank}위` : `${idx + 1}. ${p.name}`}
                                        </span>
                                        <span style={{ fontWeight: 800, color: '#4ade80', fontSize: 12 }}>{p.score}점</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>정확도: {p.totalAttempts > 0 ? Math.round(p.correctCount / p.totalAttempts * 100) : 0}%</span>
                                        <span>속도: {p.speed.toFixed(1)}/s</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
