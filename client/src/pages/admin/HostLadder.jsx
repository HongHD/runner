import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

/* ── 사다리 유틸 ── */
function tracePath(startCol, ladderCount, rowCount, bars) {
    let col = startCol;
    const path = [{ row: -1, col }];
    for (let row = 0; row < rowCount; row++) {
        const barR = bars.find(b => b.row === row && b.col === col);
        const barL = bars.find(b => b.row === row && b.col === col - 1);
        if (barR) col += 1;
        else if (barL) col -= 1;
        path.push({ row, col });
    }
    return path;
}

/* ── Canvas 사다리 그리기 ── */
function drawLadder(canvas, { ladderCount, rowCount, bars, assignments, prizes, hidden, paths, emojiProgress }) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const PAD_X = 60, PAD_TOP = 60, PAD_BOT = 60;
    const colW = (W - PAD_X * 2) / (ladderCount - 1 || 1);
    const rowH = (H - PAD_TOP - PAD_BOT) / (rowCount || 1);

    const cx = (col) => PAD_X + col * colW;
    const ry = (row) => PAD_TOP + row * rowH;

    /* 수직선 */
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    for (let c = 0; c < ladderCount; c++) {
        ctx.beginPath();
        ctx.moveTo(cx(c), PAD_TOP);
        ctx.lineTo(cx(c), H - PAD_BOT);
        ctx.stroke();
    }

    /* 가로 막대 (hidden=true면 숨김) */
    if (!hidden) {
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        bars.forEach(({ row, col }) => {
            const y = ry(row) + rowH / 2;
            ctx.beginPath();
            ctx.moveTo(cx(col), y);
            ctx.lineTo(cx(col + 1), y);
            ctx.stroke();
        });
    }

    /* 상단 이름 */
    assignments.forEach(a => {
        const x = cx(a.ladderIndex);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(a.name.length > 5 ? a.name.slice(0, 5) + '..' : a.name, x, PAD_TOP - 8);
    });

    /* 하단 경품 */
    prizes.forEach((prize, i) => {
        const x = cx(i);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        const label = prize.length > 5 ? prize.slice(0, 5) + '..' : prize;
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.beginPath();
        ctx.roundRect(x - 28, H - PAD_BOT + 6, 56, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.fillText(label, x, H - PAD_BOT + 22);
    });

    /* 이모지 애니메이션 */
    if (paths && emojiProgress !== undefined) {
        assignments.forEach((a, ai) => {
            const path = paths[ai];
            if (!path) return;
            const idx = Math.min(Math.floor(emojiProgress * (path.length - 1)), path.length - 1);
            const pt = path[idx];
            const y = pt.row < 0 ? PAD_TOP - 20 : ry(pt.row);
            ctx.font = '22px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🙂', cx(pt.col), y + 8);
        });
    }
}

/* ── 메인 컴포넌트 ── */
export default function HostLadder() {
    const navigate = useNavigate();
    const { admin } = useAuthStore();
    const { setSocket, setRoomInfo } = useGameStore();
    const socketRef = useRef(null);
    const canvasRef = useRef(null);
    const animRef = useRef(null);

    const persistentPin = admin?.pinCode || '';

    // 상태
    const [phase, setPhase] = useState('setup'); // setup | ready | playing | result
    const [participants, setParticipants] = useState([]);
    const [mode, setMode] = useState('individual'); // individual | team
    const [ladderCount, setLadderCount] = useState(4);
    const [assignments, setAssignments] = useState([]); // [{id,name,ladderIndex}]
    const [prizes, setPrizes] = useState(['', '', '', '']);
    const [dragItem, setDragItem] = useState(null);
    const [gameData, setGameData] = useState(null);
    const [emojiProgress, setEmojiProgress] = useState(0);
    const [paths, setPaths] = useState(null);

    /* 사다리 수 변경 시 prize 배열 동기화 */
    useEffect(() => {
        setPrizes(prev => {
            const next = [...prev];
            while (next.length < ladderCount) next.push('');
            return next.slice(0, ladderCount);
        });
        setAssignments(prev => prev.filter(a => a.ladderIndex < ladderCount));
    }, [ladderCount]);

    /* Socket 연결 */
    useEffect(() => {
        if (!admin?.pinCode) return;
        setRoomInfo(admin.pinCode, 'Host');
        const sock = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = sock;
        socketRef.current = sock;
        setSocket(sock);

        const doJoin = () => {
            sock.emit('admin_join', { pinCode: persistentPin, adminId: admin.id, gameTitle: '사다리 게임', gameType: 'ladder' });
            setTimeout(() => {
                sock.emit('admin_start_game', { pinCode: persistentPin, gameTitle: '사다리 게임', gameType: 'ladder' });
            }, 500);
        };
        sock.on('connect', doJoin);
        if (sock.connected) doJoin();

        sock.on('online_participants', (data) => setParticipants(data.participants || []));
        sock.on('participant_update', (data) => {
            if (data.type === 'join') setParticipants(prev => prev.find(p => p.id === data.participant.id) ? prev : [...prev, data.participant]);
            else if (data.type === 'leave') setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
        });
        sock.on('ladder_game_started', (data) => {
            setGameData(data);
            setPhase('playing');
            // 경로 계산
            const ps = data.assignments.map(a => tracePath(a.ladderIndex, data.ladderCount, data.rowCount, data.bars));
            setPaths(ps);
            startAnimation();
        });

        return () => {
            sock.off('connect', doJoin);
            sock.off('online_participants');
            sock.off('participant_update');
            sock.off('ladder_game_started');
        };
    }, [admin?.pinCode]);

    /* Canvas 다시 그리기 */
    useEffect(() => {
        if (!canvasRef.current) return;
        const rowCount = Math.max(10, ladderCount * 3);
        if (phase === 'setup' || phase === 'ready') {
            drawLadder(canvasRef.current, {
                ladderCount,
                rowCount,
                bars: [],
                assignments,
                prizes,
                hidden: true,
                paths: null,
                emojiProgress: 0,
            });
        }
    }, [phase, ladderCount, assignments, prizes]);

    /* 애니메이션 */
    const startAnimation = useCallback(() => {
        let progress = 0;
        const DURATION = 4000;
        const start = Date.now();
        const tick = () => {
            progress = Math.min((Date.now() - start) / DURATION, 1);
            setEmojiProgress(progress);
            if (progress < 1) animRef.current = requestAnimationFrame(tick);
            else setTimeout(() => setPhase('result'), 500);
        };
        animRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        if (phase === 'playing' && gameData && canvasRef.current) {
            drawLadder(canvasRef.current, {
                ladderCount: gameData.ladderCount,
                rowCount: gameData.rowCount,
                bars: gameData.bars,
                assignments: gameData.assignments,
                prizes: gameData.prizes,
                hidden: false,
                paths,
                emojiProgress,
            });
        }
    }, [phase, gameData, paths, emojiProgress]);

    /* 드래그 앤 드롭 */
    const handleDragStart = (participant) => setDragItem(participant);
    const handleDropOnLadder = (ladderIdx) => {
        if (!dragItem) return;
        setAssignments(prev => {
            const filtered = prev.filter(a => a.id !== dragItem.id && a.ladderIndex !== ladderIdx);
            return [...filtered, { id: dragItem.id, name: dragItem.name, ladderIndex: ladderIdx }];
        });
        setDragItem(null);
    };
    const handleRemoveAssignment = (id) => setAssignments(prev => prev.filter(a => a.id !== id));

    /* 게임 시작 */
    const handleStartGame = () => {
        if (assignments.length === 0) { alert('사다리에 참가자를 배치해주세요.'); return; }
        const filledPrizes = prizes.map((p, i) => p.trim() || `경품 ${i + 1}`);
        socketRef.current.emit('admin_ladder_start', {
            pinCode: persistentPin,
            ladderCount,
            assignments,
            prizes: filledPrizes,
            mode,
        });
    };

    const handleEndGame = () => {
        if (window.confirm('게임을 종료하시겠습니까?')) {
            socketRef.current?.emit('admin_ladder_reset', { pinCode: persistentPin });
            socketRef.current?.emit('admin_end_game', { pinCode: persistentPin });
            socketRef.current?.emit('admin_leave_game', { pinCode: persistentPin });
            if (animRef.current) cancelAnimationFrame(animRef.current);
            navigate('/admin/dashboard');
        }
    };

    const handleReset = () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setPhase('setup');
        setGameData(null);
        setPaths(null);
        setEmojiProgress(0);
        setAssignments([]);
        socketRef.current?.emit('admin_ladder_reset', { pinCode: persistentPin });
    };

    /* 팀 목록 (팀전 모드) */
    const teams = [...new Set(participants.map(p => p.team).filter(Boolean))];
    const listItems = mode === 'team' ? teams.map(t => ({ id: t, name: t })) : participants.map(p => ({ id: p.id, name: p.name }));
    const assignedIds = new Set(assignments.map(a => a.id));
    const unassigned = listItems.filter(item => !assignedIds.has(item.id));

    return (
        <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>🪜</span>
                    <h1 style={{ fontSize: 19, margin: 0, fontWeight: 800 }}>사다리 게임</h1>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 12, color: 'rgba(255,255,255,0.4)' }}>PIN: {persistentPin}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: phase === 'playing' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', color: phase === 'playing' ? '#4ade80' : 'rgba(255,255,255,0.4)', border: `1px solid ${phase === 'playing' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                        {phase === 'setup' ? '⚙️ 설정 중' : phase === 'ready' ? '🟡 대기 중' : phase === 'playing' ? '🔴 게임 중' : '✅ 결과'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {phase === 'setup' && (
                        <button onClick={handleStartGame} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            ▶ 게임 시작
                        </button>
                    )}
                    {(phase === 'playing' || phase === 'result') && (
                        <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            🔄 다시하기
                        </button>
                    )}
                    <button onClick={handleEndGame} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        ⏹ 게임 종료
                    </button>
                </div>
            </header>

            <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* 왼쪽 설정 패널 */}
                {phase === 'setup' && (
                    <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.06)', padding: 20, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
                        {/* 모드 선택 */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>게임 모드</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['individual', 'team'].map(m => (
                                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === m ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${mode === m ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`, color: mode === m ? '#00d4ff' : 'rgba(255,255,255,0.5)' }}>
                                        {m === 'individual' ? '👤 개인전' : '👥 팀전'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 사다리 수 */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>사다리 수</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <button key={n} onClick={() => setLadderCount(n)} style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: ladderCount === n ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${ladderCount === n ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`, color: ladderCount === n ? '#00d4ff' : 'rgba(255,255,255,0.5)' }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 경품 입력 */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>경품 설정 (사다리 하단)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {prizes.map((p, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', width: 20, textAlign: 'right' }}>{i + 1}</span>
                                        <input value={p} onChange={e => setPrizes(prev => { const n = [...prev]; n[i] = e.target.value; return n; })} placeholder={`경품 ${i + 1} (예: 당첨!)`} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 참가자 목록 (드래그 소스) */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>
                                {mode === 'team' ? '팀 목록' : '참가자 목록'} (드래그해서 배치)
                            </div>
                            {unassigned.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 12 }}>모두 배치됨</div>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {unassigned.map(item => (
                                    <div key={item.id} draggable onDragStart={() => handleDragStart(item)} style={{ padding: '8px 12px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, cursor: 'grab', fontSize: 13, fontWeight: 600, color: '#00d4ff', userSelect: 'none' }}>
                                        🙂 {item.name}
                                    </div>
                                ))}
                            </div>
                            {participants.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>아직 접속자가 없습니다.</div>}
                        </div>
                    </div>
                )}

                {/* 중앙 사다리 Canvas */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 24 }}>
                    {phase === 'setup' && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ladderCount}, 1fr)`, gap: 12, marginBottom: 20, width: '100%', maxWidth: 700 }}>
                            {Array.from({ length: ladderCount }).map((_, i) => {
                                const assigned = assignments.find(a => a.ladderIndex === i);
                                return (
                                    <div key={i} onDragOver={e => e.preventDefault()} onDrop={() => handleDropOnLadder(i)} style={{ minHeight: 50, background: assigned ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)', border: `2px dashed ${assigned ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, textAlign: 'center', transition: 'all 0.15s', cursor: 'default' }}>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>사다리 {i + 1}</div>
                                        {assigned ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#00d4ff' }}>{assigned.name}</span>
                                                <button onClick={() => handleRemoveAssignment(assigned.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>여기에 드롭</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <canvas ref={canvasRef} width={700} height={460} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '100%' }} />

                    {phase === 'setup' && <div style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>게임 시작 전까지 사다리 구조는 공개되지 않습니다.</div>}
                </div>

                {/* 오른쪽 결과 패널 */}
                {phase === 'result' && gameData && (
                    <div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 24, overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.05em' }}>🎉 결과</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {gameData.assignments.map((a) => {
                                const prizeIdx = gameData.results[a.ladderIndex];
                                const prize = gameData.prizes[prizeIdx] || '?';
                                return (
                                    <div key={a.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px', borderLeft: `3px solid ${prize.includes('당첨') || prize.includes('1등') ? '#fbbf24' : 'rgba(255,255,255,0.15)'}` }}>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>{a.name}</div>
                                        <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>{prize}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
