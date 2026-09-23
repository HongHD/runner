import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, MessageSquare, Download } from 'lucide-react';

export default function HostSurvey() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { admin } = useAuthStore();
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended
    const [notes, setNotes] = useState([]);
    const boardRef = useRef(null);

    const persistentPin = admin?.pinCode || 'WAIT..';
    const { setSocket, setRoomInfo } = useGameStore();

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');

        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) {
            window._adminSocket = currentSocket;
        }
        setSocket(currentSocket);

        const onConnect = () => {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '실시간 설문',
                gameType: 'survey'
            });

            // Re-fetch notes if already playing
            if (gameStatus === 'playing') {
                currentSocket.emit('admin_request_notes', { pinCode: persistentPin });
            }
        };

        if (currentSocket.connected) {
            onConnect();
        } else {
            currentSocket.on('connect', onConnect);
        }

        currentSocket.on('new_note', (data) => {
            setNotes(prev => [...prev, data]);
        });

        currentSocket.on('all_notes', (data) => {
            setNotes(data.notes || []);
        });

        return () => {
            currentSocket.off('connect', onConnect);
            currentSocket.off('new_note');
            currentSocket.off('all_notes');
            currentSocket.emit('admin_leave_game', { pinCode: persistentPin });
        };
    }, [admin?.pinCode, persistentPin, admin?.id, setRoomInfo, setSocket]);

    const socket = useGameStore.getState().socket;

    const handleStartGame = () => {
        if (!socket || !isConnected) return;
        socket.emit('admin_start_game', { pinCode: persistentPin, gameId, gameTitle: '실시간 설문' });
        setGameStatus('playing');
        setNotes([]); // Reset notes when starting fresh
        socket.emit('admin_request_notes', { pinCode: persistentPin });
    };

    const handleEndGame = () => {
        if (!socket || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까? 플레이어들은 대기 화면으로 이동합니다.')) {
            socket.emit('admin_end_game', { pinCode: persistentPin, gameId });
            setGameStatus('ended');
        }
    };

    // Calculate absolute position based on percentage (x,y are 0-100)
    const getNoteStyle = (note, isDragging) => {
        return {
            position: 'absolute',
            left: `${note.x}%`,
            top: `${note.y}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: note.color || '#fbbf24', // Default yellow
            color: '#1e293b',
            padding: '16px',
            borderRadius: '4px',
            boxShadow: isDragging ? '8px 12px 20px rgba(0,0,0,0.5)' : '3px 4px 10px rgba(0,0,0,0.3)',
            minWidth: '200px',
            maxWidth: '300px',
            minHeight: '200px',
            zIndex: isDragging ? 50 : 10,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif', // Post-it feel font
            transition: isDragging ? 'none' : 'box-shadow 0.2s',
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            cursor: 'grab'
        };
    };

    // --- Drag and Drop Logic ---
    const [draggingNoteId, setDraggingNoteId] = useState(null);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e, noteId) => {
        e.preventDefault();
        // Prevent if playing status is weird, but usually fine
        setDraggingNoteId(noteId);

        // Since we are moving percentages, we need to know pixels per percentage
        dragStartPos.current = {
            startX: e.clientX,
            startY: e.clientY
        };
    };

    const handlePointerMove = (e) => {
        if (!draggingNoteId) return;

        const boardRect = boardRef.current?.getBoundingClientRect();
        if (!boardRect) return;

        const dx = e.clientX - dragStartPos.current.startX;
        const dy = e.clientY - dragStartPos.current.startY;

        const percX = (dx / boardRect.width) * 100;
        const percY = (dy / boardRect.height) * 100;

        setNotes((prevNotes) => prevNotes.map(n => {
            if (n.id === draggingNoteId) {
                // Return clamped new positions
                return {
                    ...n,
                    x: Math.max(0, Math.min(100, n.x + percX)),
                    y: Math.max(0, Math.min(100, n.y + percY))
                };
            }
            return n;
        }));

        // Reset start pos for next move calculation
        dragStartPos.current = {
            startX: e.clientX,
            startY: e.clientY
        };
    };

    const handlePointerUp = () => {
        if (draggingNoteId) {
            setDraggingNoteId(null);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <style>
                {`
                    @keyframes popIn {
                        from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                    /* Modern Glassboard background effect */
                    .corkboard {
                        background: radial-gradient(circle at top left, rgba(30,58,138,0.4), transparent 50%),
                                    radial-gradient(circle at bottom right, rgba(147,51,234,0.3), transparent 50%),
                                    #0f172a; /* Slate 900 base */
                        position: relative;
                        flex: 1;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,0.05);
                        border-radius: 16px;
                        margin: 24px;
                        box-shadow: inset 0 0 40px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.3);
                    }
                    /* Subtle modern grid overlay */
                    .corkboard::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                        background-size: 32px 32px;
                        pointer-events: none;
                        z-index: 1; /* Below the notes which are z-index 10+ */
                    }
                `}
            </style>

            {/* ── Header ── */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <div>
                    <h1 style={{ fontSize: 20, margin: 0, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MessageSquare size={24} color="#fbbf24" />
                        실시간 설문 (패들렛)
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: '#fbbf24', letterSpacing: '0.05em', marginTop: 4 }}>
                        // REALTIME_SURVEY · 라이브 메모 보드
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

                    <button onClick={() => {
                        // Export to CSV
                        if (notes.length === 0) {
                            alert('저장할 메모가 없습니다.');
                            return;
                        }

                        // Create CSV content (BOM for Excel UTF-8)
                        const headers = ['메모 작성자', '소속 팀', '내용', '작성 시간'];

                        const rows = notes.map(n => {
                            const date = n.created_at ? new Date(n.created_at).toLocaleString('ko-KR') : '-';
                            const team = n.team || '-';
                            const author = n.nickname || '익명';
                            // Escape commas and quotes within the content
                            const content = `"${(n.content || '').replace(/"/g, '""')}"`;
                            return `${author},${team},${content},${date}`;
                        });

                        const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);

                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `실시간설문_결과_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                        style={{
                            marginLeft: 16, display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                        <Download size={14} /> 결과 엑셀 저장
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

            {/* ── Main Board Area ── */}
            <main
                className="corkboard"
                ref={boardRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {notes.map((note) => (
                    <div
                        key={note.id}
                        style={getNoteStyle(note, draggingNoteId === note.id)}
                        onPointerDown={(e) => handlePointerDown(e, note.id)}
                    >
                        {/* Note Header / Tape */}
                        <div style={{
                            position: 'absolute', top: -12, left: '50%',
                            width: 60, height: 24, background: 'rgba(255,255,255,0.4)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.05)',
                            transform: 'translateX(-50%) rotate(-2deg)',
                            pointerEvents: 'none' // Prevent snagging the drag on the tape
                        }} />

                        {/* Content */}
                        <div style={{ flex: 1, fontSize: 18, lineHeight: 1.4, fontWeight: 600, wordBreak: 'break-word', paddingTop: 8, pointerEvents: 'none' }}>
                            {note.content}
                        </div>

                        {/* Author Info */}
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: 12, fontWeight: 800, opacity: 0.8, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 8, pointerEvents: 'none' }}>
                            {note.team && <span style={{ marginRight: 6 }}>[{note.team}팀]</span>}
                            <span>- {note.nickname}</span>
                        </div>
                    </div>
                ))}

                {notes.length === 0 && gameStatus === 'playing' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(0,0,0,0.3)', fontSize: 24, fontWeight: 700 }}>
                        작성된 메모가 이곳에 실시간으로 나타납니다.
                    </div>
                )}
                {gameStatus !== 'playing' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(0,0,0,0.4)', fontSize: 24, fontWeight: 700, background: 'rgba(255,255,255,0.8)', padding: '20px 40px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        상단의 [게임 시작]을 클릭하면 설문이 시작됩니다!
                    </div>
                )}
            </main>
        </div>
    );
}
