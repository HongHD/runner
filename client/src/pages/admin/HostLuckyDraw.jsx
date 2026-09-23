import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, RotateCcw } from 'lucide-react';
import LuckyDrawCanvas from '../../components/game/LuckyDrawCanvas';

export default function HostLuckyDraw() {
    const navigate = useNavigate();
    const { admin } = useAuthStore();
    const { setSocket, setRoomInfo } = useGameStore();

    const [isConnected, setIsConnected] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [previousWinners, setPreviousWinners] = useState([]);

    // drawState: 'ready' -> 'mixing' -> 'drawing' -> 'result'
    const [drawState, setDrawState] = useState('ready');
    const [winner, setWinner] = useState(null);
    const [allowDuplicateWinner, setAllowDuplicateWinner] = useState(false);

    const canvasRef = useRef(null);
    const ballsRef = useRef([]);
    const animationRef = useRef();
    const socketRef = useRef(null);

    const persistentPin = admin?.pinCode || 'WAIT..';

    // ──────────────────────────────────────────────────────────────
    // Socket 연결
    // ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');
        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = currentSocket;
        socketRef.current = currentSocket;
        setSocket(currentSocket);

        const doJoin = () => {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '행운권 추첨',
                gameType: 'lucky_draw',
            });
            // 참가자 화면을 행운권 추첨 대기 화면으로 동기화
            setTimeout(() => {
                currentSocket.emit('admin_start_game', {
                    pinCode: persistentPin,
                    gameTitle: '행운권 추첨',
                    gameType: 'lucky_draw',
                });
            }, 500);
        };

        currentSocket.on('connect', doJoin);
        if (currentSocket.connected) doJoin();

        currentSocket.on('online_participants', (data) => {
            setParticipants(data.participants || []);
        });

        currentSocket.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) return prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p);
                    return [...prev, data.participant];
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        currentSocket.on('lucky_draw_result', (data) => {
            setWinner(data.winner);
            // 3초 뒤에 결과 그리기 시작
            setTimeout(() => {
                setDrawState('drawing');
                setTimeout(() => {
                    setDrawState('result');
                    setPreviousWinners(data.allWinners || []);
                }, 1500); // 확대되는 시간
            }, 3000); // 3초간 강하게 섞임
        });

        currentSocket.on('lucky_draw_no_candidates', () => {
            alert('더 이상 추첨할 대상이 없습니다!');
            setDrawState('ready');
        });

        return () => {
            currentSocket.off('connect', doJoin);
            currentSocket.off('online_participants');
            currentSocket.off('participant_update');
            currentSocket.off('lucky_draw_result');
            currentSocket.off('lucky_draw_no_candidates');
        };
    }, [admin?.pinCode]);


    // ──────────────────────────────────────────────────────────────
    // Handler 파트
    // ──────────────────────────────────────────────────────────────

    const handleStartGame = () => {
        if (!socketRef.current || !isConnected) return;
        const candidates = participants.filter(p => allowDuplicateWinner || !previousWinners.includes(p.name || p.nickname));
        if (candidates.length === 0) {
            alert("모든 접속자가 이미 당첨되었습니다!");
            return;
        }

        setDrawState('mixing');
        socketRef.current.emit('admin_lucky_draw', { pinCode: persistentPin, allowDuplicateWinner });
    };

    const handleRestart = () => {
        setDrawState('ready');
        setWinner(null);
        // 공들은 useEffect 훅을 통해 `participants`와 `drawState=ready`일때 갱신됨.
    };

    const handleEndGame = () => {
        if (window.confirm('게임을 종료하시겠습니까? 참가자는 대기 화면으로 이동합니다.')) {
            socketRef.current.emit('admin_lucky_draw_reset', { pinCode: persistentPin });
            socketRef.current.emit('admin_end_game', { pinCode: persistentPin }); // 공통 게임 종료 (wait_room으로 되돌리기)
            socketRef.current.emit('admin_leave_game', { pinCode: persistentPin });
            navigate('/admin/dashboard');
        }
    };

    const handleExit = () => {
        if (window._adminSocket) {
            window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin });
        }
        navigate('/admin/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>🎫</span>
                    <h1 style={{ fontSize: 19, margin: 0, fontWeight: 800, color: '#fff' }}>
                        행운권 추첨
                    </h1>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                        padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 12,
                    }}>
                        PIN: {persistentPin}
                    </span>
                    <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 12,
                        background: drawState === 'mixing' || drawState === 'drawing' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                        color: drawState === 'mixing' || drawState === 'drawing' ? '#4ade80' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${drawState === 'mixing' || drawState === 'drawing' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                        {drawState === 'mixing' || drawState === 'drawing' ? '🔴 추첨중' : drawState === 'result' ? '결과확인' : '대기중'}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* 중복 당첨 허용 토글 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>이전 당첨자 포함</span>
                        <div 
                            onClick={() => setAllowDuplicateWinner(!allowDuplicateWinner)}
                            style={{
                                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                                background: allowDuplicateWinner ? '#4ade80' : 'rgba(255,255,255,0.2)',
                                position: 'relative', transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 2, left: allowDuplicateWinner ? 18 : 2,
                                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>

                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginRight: 10 }}>
                        👥 접속자: {participants.length}명
                    </span>

                    {(drawState === 'ready' || drawState === 'mixing') && (
                        <button
                            onClick={handleStartGame}
                            disabled={drawState === 'mixing' || participants.length === 0}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: drawState === 'mixing' ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
                                border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
                                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                cursor: drawState === 'mixing' || participants.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: drawState === 'mixing' || participants.length === 0 ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                        >
                            <Play size={15} fill="currentColor" /> 추첨 시작
                        </button>
                    )}

                    {drawState === 'result' && (
                        <button
                            onClick={handleRestart}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw size={14} /> 다시 뽑기
                        </button>
                    )}

                    <button
                        onClick={handleEndGame}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        <Square size={13} fill="currentColor" /> 게임 종료
                    </button>

                    <button
                        onClick={handleExit}
                        style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: 8,
                            fontSize: 13, cursor: 'pointer',
                        }}
                    >
                        나가기
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                    {/* 당첨 결과 배경 이펙트 */}
                    {drawState === 'result' && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.1) 0%, transparent 60%)',
                            animation: 'fadeIn 1s ease', pointerEvents: 'none'
                        }} />
                    )}

                    {/* Canvas Container */}
                    <LuckyDrawCanvas
                        participants={participants}
                        previousWinners={previousWinners}
                        drawState={drawState}
                        winner={winner}
                        allowDuplicateWinner={allowDuplicateWinner}
                    />
                </div>

                {/* Right Panel (당첨자 목록) */}
                <div style={{
                    width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.01)', padding: 24, display: 'flex', flexDirection: 'column'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.05em' }}>
                        🎉 이전 당첨자 ({previousWinners.length})
                    </h3>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {previousWinners.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 40 }}>
                                아직 당첨자가 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[...previousWinners].reverse().map((pw, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px',
                                        fontSize: 14, fontWeight: 700, color: '#fbbf24', borderLeft: '3px solid #fbbf24',
                                        display: 'flex', alignItems: 'center', gap: 10
                                    }}>
                                        <span style={{ fontSize: 11, background: 'rgba(251,191,36,0.2)', padding: '2px 6px', borderRadius: 4, color: '#fcd34d' }}>
                                            {previousWinners.length - i}회차
                                        </span>
                                        {pw}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
