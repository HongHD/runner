import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, Trophy, Users, CheckSquare, Hourglass } from 'lucide-react';

export default function HostGame() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { token, admin } = useAuthStore();
    const [participants, setParticipants] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended, ranking
    const [rankingList, setRankingList] = useState([]); // DB 기반 최종 순위

    // 탭 필터 (전체, 완료, 미완료)
    const [filter, setFilter] = useState('all');

    const persistentPin = admin?.pinCode || 'WAIT..';
    const { setSocket, resetGame, setRoomInfo } = useGameStore();

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');

        // 전역 Admin 소켓 재사용 (AdminLayout에서 초기화됨)
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
                gameTitle: '스피드 부저',
                gameType: 'speed'
            });
        });

        // 이미 연결된 상태라면 수동으로 상태 업데이트
        if (currentSocket.connected) {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '스피드 부저',
                gameType: 'speed'
            });
        }

        // 초기 목록 수신 (참가자 및 이미 결과가 있는 유저 통합)
        currentSocket.on('online_participants', (data) => {
            const list = data.participants || [];
            // participants 배열 요소를 { ...p, buzzedAt, rank, elapsedMs } 형태로 확장 관리
            setParticipants(list.map(p => ({
                ...p,
                buzzedAt: null,
                rank: null,
                elapsedMs: null
            })));
        });

        // 실시간 입장/퇴장 업데이트
        currentSocket.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) {
                        return prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p);
                    }
                    return [...prev, { ...data.participant, buzzedAt: null, rank: null, elapsedMs: null }];
                });
            } else if (data.type === 'reconnect') {
                // 순수 socketId 갱신만
                setParticipants(prev => prev.map(p =>
                    p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p
                ));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        // 스피드 부저 실시간 결과 수신
        currentSocket.on('admin_buzzer_update', (data) => {
            // data: { participantId, rank, buzzedAt, elapsedMs }
            setParticipants(prev => prev.map(p => {
                if (p.id === data.participantId) {
                    return { ...p, rank: data.rank, buzzedAt: data.buzzedAt, elapsedMs: data.elapsedMs };
                }
                return p;
            }));
        });

        // DB 기반 최종 순위 수신 (admin_show_ranking 응답)
        currentSocket.on('admin_ranking_data', (data) => {
            const list = data.ranking || [];
            setRankingList(list);
            // participants 도 rank 정보로 업데이트
            setParticipants(prev => prev.map(p => {
                const match = list.find(r => r.id === p.id);
                return match ? { ...p, rank: match.rank, elapsedMs: match.elapsedMs, buzzedAt: match.buzzedAt } : p;
            }));
        });

        return () => {
            currentSocket.emit('admin_leave_game', { pinCode: persistentPin });
            currentSocket.off('online_participants');
            currentSocket.off('participant_update');
            currentSocket.off('admin_buzzer_update');
            currentSocket.off('admin_ranking_data');
            // 게임방에서 나갈때 전역 소켓은 유지한 채로 리스너만 제거
        };
    }, [admin?.pinCode]);

    const socket = useGameStore.getState().socket;

    // 공통 게임 액션
    const handleStartGame = () => {
        if (!socket || !isConnected) return;
        socket.emit('admin_start_game', { pinCode: persistentPin, gameId: parseInt(gameId) });
        setGameStatus('playing');

        // 시작 시 모든 참가자 결과 초기화
        setParticipants(prev => prev.map(p => ({ ...p, rank: null, buzzedAt: null, elapsedMs: null })));
    };

    const handleEndGame = () => {
        if (!socket || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까? 플레이어들은 대기 화면으로 이동합니다.')) {
            socket.emit('admin_end_game', { pinCode: persistentPin, gameId });
            setGameStatus('ended');
        }
    };

    const handleShowRanking = () => {
        if (!socket || !isConnected) return;
        socket.emit('admin_show_ranking', { pinCode: persistentPin, gameId });
        setGameStatus('ranking');
    };

    const handleRestartSetup = () => {
        setGameStatus('waiting');
        setParticipants(prev => prev.map(p => ({ ...p, rank: null, buzzedAt: null, elapsedMs: null })));
    };

    // 통계 계산
    const totalCount = participants.length;
    const completedCount = participants.filter(p => p.buzzedAt).length;
    const incompleteCount = totalCount - completedCount;

    // 참가자 필터링 및 정렬
    let displayParticipants = [...participants];
    if (filter === 'completed') {
        displayParticipants = displayParticipants.filter(p => p.buzzedAt);
    } else if (filter === 'incomplete') {
        displayParticipants = displayParticipants.filter(p => !p.buzzedAt);
    }

    // 랭킹 모드면 등수 순서대로 정렬, 아니면 입장 순
    if (gameStatus === 'ranking') {
        displayParticipants.sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;
            return 0;
        });
    }

    const formatTime = (ms) => {
        if (!ms && ms !== 0) return '미참여';
        const totalMs = Math.round(ms);
        const seconds = Math.floor(totalMs / 1000);
        const millis = totalMs % 1000;
        return `${seconds}.${String(millis).padStart(3, '0')}s`;
    };

    // ── 순위 확인 모드: 전체 리더보드 표시 ──
    if (gameStatus === 'ranking') {
        const sorted = rankingList.length > 0
            ? [...rankingList]
            : [...participants].sort((a, b) => {
                if (a.rank && b.rank) return a.rank - b.rank;
                if (a.rank) return -1;
                if (b.rank) return 1;
                return 0;
            });

        const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309'];
        const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

        return (
            <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            🏆 최종 순위
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                        </h1>
                        <div style={{ fontSize: 11, color: 'var(--rvd-cyan)', marginTop: 4 }}>// SPEED_BUZZER · FINAL RANKING</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleRestartSetup}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            <Play size={16} fill="currentColor" /> 게임 재설정
                        </button>
                        <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }}
                            style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                            나가기
                        </button>
                    </div>
                </header>

                <main style={{ padding: '32px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
                    {sorted.map((p, i) => {
                        const rankNum = p.rank;
                        const isTop3 = rankNum && rankNum <= 3;
                        const hasBuzzed = !!p.buzzedAt;
                        return (
                            <div key={p.id || i} style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                background: isTop3 ? `rgba(${rankNum === 1 ? '251,191,36' : rankNum === 2 ? '148,163,184' : '180,83,9'},0.08)` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isTop3 ? RANK_COLORS[rankNum - 1] + '44' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 10, padding: '14px 20px', marginBottom: 8,
                                transition: 'all 0.2s',
                            }}>
                                {/* 순위 */}
                                <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                                    {isTop3 ? (
                                        <span style={{ fontSize: 24 }}>{RANK_EMOJIS[rankNum - 1]}</span>
                                    ) : hasBuzzed ? (
                                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--rvd-text-dim)' }}>{rankNum}등</span>
                                    ) : (
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>-</span>
                                    )}
                                </div>

                                {/* 아바타 */}
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: hasBuzzed ? 'linear-gradient(135deg,#22c55e,#166534)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                    {(p.name || '?').charAt(0).toUpperCase()}
                                </div>

                                {/* 이름 + 팀 */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                                    {p.team != null && p.team !== '' && (
                                        <div style={{ fontSize: 11, color: '#c084fc', marginTop: 2 }}>
                                            {String(p.team).includes('팀') ? p.team : `${p.team}팀`}
                                        </div>
                                    )}
                                </div>

                                {/* 기록 */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    {hasBuzzed ? (
                                        <div style={{ fontSize: 18, fontWeight: 800, color: isTop3 ? RANK_COLORS[rankNum - 1] : '#4ade80', fontFamily: 'Orbitron, monospace' }}>
                                            {formatTime(p.elapsedMs)}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>미참여</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {sorted.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--rvd-text-dim)' }}>결과가 없습니다.</div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>

            {/* ── 헤더 (스크린샷 참고) ── */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <div>
                    <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        스피드 부저
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: 'var(--rvd-cyan)', letterSpacing: '0.05em', marginTop: 4 }}>
                        // SPEED_BUZZER · 실시간 스위치 현황
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleStartGame} disabled={gameStatus === 'playing'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: gameStatus === 'playing' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                            border: `1px solid ${gameStatus === 'playing' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)'}`,
                            color: '#4ade80', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: gameStatus === 'playing' ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            opacity: gameStatus === 'playing' ? 0.6 : 1
                        }}>
                        <Play size={16} fill="currentColor" /> 게임 시작
                    </button>

                    <button onClick={handleEndGame} disabled={gameStatus !== 'playing'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: gameStatus !== 'playing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: gameStatus !== 'playing' ? 'not-allowed' : 'pointer',
                            opacity: gameStatus !== 'playing' ? 0.5 : 1
                        }}>
                        <Square size={14} fill="currentColor" /> 게임 종료
                    </button>

                    <button onClick={handleShowRanking} disabled={gameStatus !== 'ended' && gameStatus !== 'ranking'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            color: '#c084fc', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 'not-allowed' : 'pointer',
                            opacity: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 0.5 : 1
                        }}>
                        <Trophy size={16} /> 순위 확인
                    </button>

                    <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }}
                        style={{
                            marginLeft: 16, display: 'flex', alignItems: 'center',
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer'
                        }}>
                        나가기
                    </button>
                </div>
            </header>

            <main style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* ── 상단 통계 바 ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24 }}>
                    {/* 전체 */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)', marginBottom: 8 }}>소켓 연결 유지</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--rvd-cyan)', textShadow: '0 0 20px rgba(0,212,255,0.4)', lineHeight: 1 }}>{totalCount}</div>
                        </div>
                        <Users size={32} style={{ color: 'var(--rvd-text-dim)', opacity: 0.3 }} />
                    </div>

                    {/* 완료 */}
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', borderRadius: 12, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)', marginBottom: 8 }}>완료</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#4ade80', textShadow: '0 0 20px rgba(34, 197, 94, 0.4)', lineHeight: 1 }}>{completedCount}</div>
                        </div>
                        <CheckSquare size={32} style={{ color: '#4ade80', opacity: 0.3 }} />
                    </div>

                    {/* 미완료 */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 12, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)', marginBottom: 8 }}>미완료</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', textShadow: '0 0 20px rgba(239, 68, 68, 0.4)', lineHeight: 1 }}>{incompleteCount}</div>
                        </div>
                        <Hourglass size={32} style={{ color: '#ef4444', opacity: 0.3 }} />
                    </div>
                </div>

                {/* ── 컨트롤 및 목록 헤더 ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)' }}>
                        참가자 현황 ({totalCount}명)
                    </div>

                    {/* 필터 탭 */}
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setFilter('all')} style={{
                            padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: filter === 'all' ? 'rgba(0,212,255,0.15)' : 'transparent',
                            color: filter === 'all' ? 'var(--rvd-cyan)' : 'var(--rvd-text-dim)'
                        }}>전체</button>
                        <button onClick={() => setFilter('completed')} style={{
                            padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: filter === 'completed' ? 'rgba(34,197,94,0.15)' : 'transparent',
                            color: filter === 'completed' ? '#4ade80' : 'var(--rvd-text-dim)'
                        }}>완료</button>
                        <button onClick={() => setFilter('incomplete')} style={{
                            padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: filter === 'incomplete' ? 'rgba(239,68,68,0.15)' : 'transparent',
                            color: filter === 'incomplete' ? '#ef4444' : 'var(--rvd-text-dim)'
                        }}>미완료</button>
                    </div>
                </div>

                {/* ── 참가자 그리드 (스크린샷 참고) ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12, alignContent: 'start', flex: 1, overflowY: 'auto',
                    paddingRight: 8 // for scrollbar padding
                }}>
                    {displayParticipants.map((p, i) => {
                        const isDone = !!p.buzzedAt;

                        return (
                            <div key={p.socketId || i} style={{
                                position: 'relative',
                                background: isDone ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isDone ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: 8, padding: '16px 12px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}>
                                {/* 순위 뱃지 (있을 경우만) */}
                                {p.rank && (
                                    <div style={{
                                        position: 'absolute', top: -8, left: -8,
                                        width: 20, height: 20, borderRadius: '50%',
                                        background: p.rank === 1 ? '#fbbf24' : p.rank === 2 ? '#94a3b8' : p.rank === 3 ? '#b45309' : '#1e293b',
                                        border: `1px solid ${p.rank <= 3 ? '#fff' : 'rgba(255,255,255,0.2)'}`,
                                        color: '#fff', fontSize: 10, fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: p.rank <= 3 ? '0 0 10px rgba(0,0,0,0.5)' : 'none'
                                    }}>
                                        {p.rank}
                                    </div>
                                )}

                                {/* 프로필 아이콘 흉내 - 닉네임 첫글자 */}
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', marginBottom: 12,
                                    background: isDone ? 'linear-gradient(135deg, #22c55e, #166534)' : 'linear-gradient(135deg, #00d4ff, #004466)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 800, color: '#fff'
                                }}>
                                    {(p.name || '?').charAt(0).toUpperCase()}
                                </div>

                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4, width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.name}
                                </div>

                                {isDone ? (
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', fontFamily: 'Orbitron, monospace' }}>
                                        {formatTime(p.elapsedMs)}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 11, color: 'var(--rvd-text-dim)' }}>
                                        진행 중
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {displayParticipants.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--rvd-text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                            현재 표시할 참가자가 없습니다.
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
