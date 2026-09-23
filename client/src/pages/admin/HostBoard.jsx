import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square, MessageSquare, Download, Image as ImageIcon, FileText } from 'lucide-react';

export default function HostBoard() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { admin } = useAuthStore();
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended
    const [posts, setPosts] = useState([]);

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
                gameTitle: '게시판',
                gameType: 'board'
            });

            // Re-fetch posts if already playing
            if (gameStatus === 'playing') {
                currentSocket.emit('admin_request_board_posts', { pinCode: persistentPin });
            }
        };

        if (currentSocket.connected) {
            onConnect();
        } else {
            currentSocket.on('connect', onConnect);
        }

        currentSocket.on('new_board_post', (data) => {
            setPosts(prev => [data, ...prev]);
        });

        currentSocket.on('all_board_posts', (data) => {
            setPosts((data.posts || []).reverse()); // newest first
        });

        return () => {
            currentSocket.off('connect', onConnect);
            currentSocket.off('new_board_post');
            currentSocket.off('all_board_posts');
            currentSocket.emit('admin_leave_game', { pinCode: persistentPin });
        };
    }, [admin?.pinCode, persistentPin, admin?.id, setRoomInfo, setSocket]);

    const socket = useGameStore.getState().socket;

    const handleStartGame = () => {
        if (!socket || !isConnected) return;
        socket.emit('admin_start_game', { pinCode: persistentPin, gameId, gameTitle: '게시판' });
        setGameStatus('playing');
        setPosts([]); // Reset notes when starting fresh
        socket.emit('admin_request_board_posts', { pinCode: persistentPin });
    };

    const handleEndGame = () => {
        if (!socket || !isConnected) return;
        if (window.confirm('게시판 운영을 종료하시겠습니까? 플레이어들은 대기 화면으로 이동합니다.')) {
            socket.emit('admin_end_game', { pinCode: persistentPin, gameId });
            setGameStatus('ended');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--rvd-bg, #040914)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <style>
                {`
                    @keyframes slideInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .board-container {
                        background: radial-gradient(circle at top, rgba(0, 212, 255, 0.1), transparent 60%),
                                    #090d15;
                        position: relative;
                        flex: 1;
                        padding: 24px;
                        overflow-y: auto;
                    }
                    .masonry-grid {
                        column-count: 3;
                        column-gap: 24px;
                        width: 100%;
                    }
                    @media (max-width: 1200px) { .masonry-grid { column-count: 2; } }
                    @media (max-width: 768px) { .masonry-grid { column-count: 1; } }

                    .post-card {
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 24px;
                        display: inline-block;
                        width: 100%;
                        break-inside: avoid;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        animation: slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .post-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 12px 30px rgba(0, 212, 255, 0.15);
                        border-color: rgba(0, 212, 255, 0.3);
                    }
                    .post-image {
                        width: 100%;
                        border-radius: 12px;
                        margin-bottom: 16px;
                        object-fit: cover;
                        background: rgba(0,0,0,0.5);
                    }
                    .post-content {
                        font-size: 16px;
                        line-height: 1.6;
                        color: #f1f5f9;
                        margin-bottom: 16px;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }
                    .post-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid rgba(255,255,255,0.05);
                    }
                    .post-author {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 700;
                        font-size: 14px;
                        color: #E2E8F0;
                    }
                    .author-avatar {
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, var(--rvd-cyan, #00d4ff), #004466);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        color: #fff;
                    }
                    .post-time {
                        font-size: 12px;
                        color: #64748b;
                    }
                    .attachment-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        padding: 6px 12px;
                        border-radius: 8px;
                        font-size: 12px;
                        color: #cbd5e1;
                        text-decoration: none;
                        transition: background 0.2s;
                    }
                    .attachment-badge:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: var(--rvd-cyan, #00d4ff);
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
                        <MessageSquare size={24} color="var(--rvd-cyan, #00d4ff)" />
                        실시간 게시판
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rvd-text-dim)', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: 'var(--rvd-cyan, #00d4ff)', letterSpacing: '0.05em', marginTop: 4 }}>
                        // REALTIME_BOARD · 글 & 사진 미디어 보드
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
                        <Play size={16} fill="currentColor" /> 작성 시작
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
                        <Square size={14} fill="currentColor" /> 작성 종료
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
            <main className="board-container">
                {gameStatus !== 'playing' && posts.length === 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.4)', fontSize: 24, fontWeight: 700, textAlign: 'center' }}>
                        <MessageSquare size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
                        <br />
                        상단의 [작성 시작]을 클릭하면 게시판이 열립니다.
                    </div>
                )}

                {gameStatus === 'playing' && posts.length === 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.3)', fontSize: 20, fontWeight: 600, textAlign: 'center' }}>
                        업로드된 게시물이 이곳에 실시간으로 나타납니다.
                    </div>
                )}

                <div className="masonry-grid">
                    {posts.map((post) => (
                        <div key={post.id} className="post-card">
                            <div className="post-header">
                                <div className="post-author">
                                    <div className="author-avatar">
                                        {(post.nickname || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <span>
                                        {post.team && <span style={{ color: 'var(--rvd-cyan)', marginRight: 4 }}>[{post.team}]</span>}
                                        {post.nickname}
                                    </span>
                                </div>
                                <div className="post-time">
                                    {new Date(post.createdAt || Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {post.imageUrl && (
                                <img src={post.imageUrl} alt="Uploaded" className="post-image" />
                            )}

                            {post.content && (
                                <div className="post-content">
                                    {post.content}
                                </div>
                            )}

                            {post.attachmentUrl && (
                                <a href={post.attachmentUrl} download={post.attachmentName || "download"} target="_blank" rel="noopener noreferrer" className="attachment-badge">
                                    <FileText size={14} />
                                    {post.attachmentName || '첨부파일 다운로드'}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
