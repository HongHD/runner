import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, Trophy, Users, Crosshair } from 'lucide-react';

export default function HostMole() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { token, admin } = useAuthStore();
    const [participants, setParticipants] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended, ranking
    const [rankingList, setRankingList] = useState([]);

    const persistentPin = admin?.pinCode || 'WAIT..';
    const { setSocket, setRoomInfo } = useGameStore();

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');
        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = currentSocket;
        setSocket(currentSocket);

        currentSocket.on('connect', () => {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '두더지 게임',
                gameType: 'mole',
                gameId
            });
        });

        if (currentSocket.connected) {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '두더지 게임',
                gameType: 'mole',
                gameId
            });
        }

        currentSocket.on('online_participants', (data) => {
            const list = data.participants || [];
            setParticipants(list.map(p => ({
                ...p, score: p.score || 0
            })));
        });

        currentSocket.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) return prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p);
                    return [...prev, { ...data.participant, score: 0 }];
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        currentSocket.on('admin_mole_update', (data) => {
            setParticipants(prev => prev.map(p => {
                if (p.id === data.participantId) {
                    return { ...p, score: data.score };
                }
                return p;
            }));
        });

        currentSocket.on('admin_ranking_data', (data) => {
            const list = data.ranking || [];
            setRankingList(list);
            setParticipants(prev => prev.map(p => {
                const match = list.find(r => r.id === p.id);
                return match ? { ...p, score: match.score || p.score, rank: match.rank } : p;
            }));
        });

        return () => {
            currentSocket.emit('admin_leave_game', { pinCode: persistentPin });
            currentSocket.off('online_participants');
            currentSocket.off('participant_update');
            currentSocket.off('admin_mole_update');
            currentSocket.off('admin_ranking_data');
        };
    }, [admin?.pinCode, gameId]);

    const socket = useGameStore.getState().socket;

    const handleStartGame = () => {
        if (!socket || !isConnected) return;
        socket.emit('admin_start_game', { pinCode: persistentPin, gameId });
        setGameStatus('playing');
        setParticipants(prev => prev.map(p => ({ ...p, score: 0, rank: null })));
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

    const totalCount = participants.length;

    if (gameStatus === 'ranking') {
        const sorted = rankingList.length > 0
            ? [...rankingList]
            : [...participants].sort((a, b) => b.score - a.score);

        const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309'];
        const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

        return (
            <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            🏆 두더지 게임 최종 순위
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleStartGame} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            <Play size={16} fill="currentColor" /> 게임 재시작
                        </button>
                        <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }} style={{ marginLeft: 16, display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                            나가기
                        </button>
                    </div>
                </header>

                <main style={{ padding: '32px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
                    {sorted.map((p, i) => {
                        const rankNum = p.rank || (i + 1);
                        const isTop3 = rankNum <= 3;
                        return (
                            <div key={p.id || i} style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                background: isTop3 ? `rgba(${rankNum === 1 ? '251,191,36' : rankNum === 2 ? '148,163,184' : '180,83,9'},0.08)` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isTop3 ? RANK_COLORS[rankNum - 1] + '44' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 10, padding: '14px 20px', marginBottom: 8,
                            }}>
                                <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                                    {isTop3 ? <span style={{ fontSize: 24 }}>{RANK_EMOJIS[rankNum - 1]}</span> : <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--rvd-text-dim)' }}>{rankNum}등</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name || p.nickname}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: isTop3 ? RANK_COLORS[rankNum - 1] : '#4ade80' }}>
                                        {p.score || p.score === 0 ? p.score : 0} 점
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </main>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        두더지 게임
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleStartGame} disabled={gameStatus === 'playing'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: gameStatus === 'playing' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)', border: `1px solid ${gameStatus === 'playing' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.3)'}`, color: '#4ade80', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: gameStatus === 'playing' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: gameStatus === 'playing' ? 0.6 : 1 }}>
                        <Play size={16} fill="currentColor" /> 게임 시작
                    </button>
                    <button onClick={handleEndGame} disabled={gameStatus !== 'playing'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: gameStatus !== 'playing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: gameStatus !== 'playing' ? 'not-allowed' : 'pointer', opacity: gameStatus !== 'playing' ? 0.5 : 1 }}>
                        <Square size={14} fill="currentColor" /> 게임 종료
                    </button>
                    <button onClick={handleShowRanking} disabled={gameStatus !== 'ended' && gameStatus !== 'ranking'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 'not-allowed' : 'pointer', opacity: gameStatus !== 'ended' && gameStatus !== 'ranking' ? 0.5 : 1 }}>
                        <Trophy size={16} /> 순위 확인
                    </button>
                    <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/dashboard') }} style={{ marginLeft: 16, display: 'flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                        나가기
                    </button>
                </div>
            </header>

            <main style={{ padding: '24px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)' }}>참가자 스코어보드 ({totalCount}명)</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, alignContent: 'start', flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {participants.sort((a, b) => b.score - a.score).map((p, i) => (
                        <div key={p.socketId || i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.2s' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', marginBottom: 12, background: 'linear-gradient(135deg, #00d4ff, #004466)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                                {(p.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6, width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.name}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Crosshair size={16} /> {p.score || 0}
                            </div>
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--rvd-text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                            현재 표시할 참가자가 없습니다.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
