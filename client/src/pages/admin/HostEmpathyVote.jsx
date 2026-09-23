import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import useAuthStore from '../../store/authStore';
import { io } from 'socket.io-client';
import { Play, Square, Trophy } from 'lucide-react';

export default function HostEmpathyVote() {
    const navigate = useNavigate();
    const { token, admin } = useAuthStore();
    const { setSocket, setRoomInfo } = useGameStore();

    const persistentPin = admin?.pinCode || 'WAIT..';
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting | playing | ended | ranking
    const [participants, setParticipants] = useState([]);
    const [posts, setPosts] = useState([]); // { postId, text, nickname, participantId, hearts }
    const [rankingList, setRankingList] = useState([]);
    const postsEndRef = useRef(null);

    const sock = () => window._adminSocket;

    useEffect(() => {
        if (!admin?.pinCode) return;
        setRoomInfo(admin.pinCode, 'Host');

        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = currentSocket;
        setSocket(currentSocket);

        const setupSocket = (s) => {
            setIsConnected(true);
            s.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '공감투표',
                gameType: 'empathy_vote',
            });
        };

        if (currentSocket.connected) setupSocket(currentSocket);
        currentSocket.on('connect', () => setupSocket(currentSocket));
        currentSocket.on('disconnect', () => setIsConnected(false));

        // 참가자 목록
        const handleParticipants = (data) => {
            setParticipants(data.participants || []);
        };
        currentSocket.on('online_participants', handleParticipants);

        const handleParticipantUpdate = (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    if (prev.find(p => p.id === data.participant.id)) return prev;
                    return [...prev, data.participant];
                });
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        };
        currentSocket.on('participant_update', handleParticipantUpdate);

        // 실시간 글 추가 (게임 중)
        const handleNewPost = (data) => {
            setPosts(prev => {
                if (prev.find(p => p.postId === data.postId)) return prev;
                return [...prev, { postId: data.postId, text: data.text, nickname: data.nickname, participantId: data.participantId, hearts: data.hearts || 0 }];
            });
        };
        currentSocket.on('admin_empathy_post', handleNewPost);

        // 하트 업데이트 (하트 수 기준 재정렬)
        const handleUpdate = (data) => {
            setPosts(data.posts || []);
        };
        currentSocket.on('admin_empathy_update', handleUpdate);

        // 관리자 게임 종료 확인
        const handleAdminEnded = () => {
            setGameStatus('ended');
        };
        currentSocket.on('admin_game_ended', handleAdminEnded);

        // 랭킹 데이터
        const handleRanking = (data) => {
            setRankingList(data.ranking || []);
            setGameStatus('ranking');
        };
        currentSocket.on('admin_ranking_data', handleRanking);

        return () => {
            currentSocket.off('connect');
            currentSocket.off('disconnect');
            currentSocket.off('online_participants', handleParticipants);
            currentSocket.off('participant_update', handleParticipantUpdate);
            currentSocket.off('admin_empathy_post', handleNewPost);
            currentSocket.off('admin_empathy_update', handleUpdate);
            currentSocket.off('admin_game_ended', handleAdminEnded);
            currentSocket.off('admin_ranking_data', handleRanking);
        };
    }, [admin?.pinCode, admin?.id, persistentPin, setRoomInfo, setSocket]);

    // 게임 시작
    const startGame = () => {
        if (!sock() || !isConnected) return;
        sock().emit('admin_start_game', {
            pinCode: persistentPin,
            gameTitle: '공감투표',
            settings: {}
        });
        setPosts([]);
        setGameStatus('playing');
    };

    // 게임 종료 (공감투표 전용)
    const handleEndGame = () => {
        if (!sock() || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까?\n참가자 화면에 모든 글이 공개되고 하트 투표가 시작됩니다.')) {
            sock().emit('admin_end_empathy_vote', { pinCode: persistentPin });
        }
    };

    // 순위 확인
    const handleShowRanking = () => {
        if (!sock() || !isConnected) return;
        sock().emit('admin_show_ranking', { pinCode: persistentPin });
    };

    // 나가기
    const handleLeave = () => {
        navigate('/admin/dashboard');
    };

    // ─── 랭킹 화면 ───
    if (gameStatus === 'ranking' && rankingList.length > 0) {
        return (
            <div style={{ minHeight: '100vh', background: '#0d0d1a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💬 공감투표 최종 결과</h1>
                    <button onClick={handleLeave} style={btnStyle('rgba(255,255,255,0.1)', '#fff')}>나가기</button>
                </header>
                <div style={{ flex: 1, padding: '32px 28px', overflowY: 'auto' }}>
                    {rankingList.map((p, i) => (
                        <div key={p.postId || i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 16,
                            padding: '18px 20px', borderRadius: 14, marginBottom: 12,
                            background: p.rank <= 3 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${p.rank === 1 ? 'rgba(251,191,36,0.4)' : p.rank === 2 ? 'rgba(192,192,192,0.3)' : p.rank === 3 ? 'rgba(205,127,50,0.3)' : 'rgba(255,255,255,0.06)'}`
                        }}>
                            <span style={{ fontSize: 26, minWidth: 36, textAlign: 'center' }}>
                                {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}위`}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#a5b4fc', marginBottom: 6 }}>{p.name}</div>
                                <div style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.6, wordBreak: 'break-all' }}>{p.text}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56 }}>
                                <span style={{ fontSize: 24 }}>❤️</span>
                                <span style={{ fontWeight: 800, fontSize: 18, color: '#fb7185' }}>{p.hearts}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── 메인 화면 ───
    return (
        <div style={{ minHeight: '100vh', background: '#0d0d1a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        💬 공감투표
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>PIN: {persistentPin}</span>
                        {!isConnected && <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 10 }}>연결 끊김</span>}
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.8)', marginTop: 3 }}>
                        {gameStatus === 'waiting' && '게임 시작 전 — 참가자가 입장하길 기다리는 중'}
                        {gameStatus === 'playing' && `진행 중 — 글 ${posts.length}건 등록됨`}
                        {gameStatus === 'ended' && '게임 종료 — 투표 진행 중'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {gameStatus === 'waiting' && (
                        <button onClick={startGame} style={btnStyle('rgba(34,197,94,0.15)', '#4ade80', 'rgba(34,197,94,0.3)')}>
                            <Play size={15} fill="currentColor" /> 게임 시작
                        </button>
                    )}
                    {gameStatus === 'playing' && (
                        <button onClick={handleEndGame} style={btnStyle('rgba(239,68,68,0.15)', '#ef4444', 'rgba(239,68,68,0.3)')}>
                            <Square size={14} fill="currentColor" /> 공감투표하기
                        </button>
                    )}
                    {(gameStatus === 'ended') && (
                        <button onClick={handleShowRanking} style={btnStyle('rgba(168,85,247,0.15)', '#c084fc', 'rgba(168,85,247,0.3)')}>
                            <Trophy size={15} /> 순위 확인
                        </button>
                    )}
                    <button onClick={handleLeave} style={btnStyle('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.15)')}>나가기</button>
                </div>
            </header>

            {/* 바디 */}
            <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
                {/* 좌측: 참가자 패널 */}
                <aside style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px', overflowY: 'auto', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 12, letterSpacing: 1 }}>참가자 ({participants.length}명)</div>
                    {participants.map(p => (
                        <div key={p.id || p.socketId} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 6, fontSize: 13, color: '#94a3b8', borderLeft: '3px solid #6366f1' }}>
                            {p.name || p.nickname}
                        </div>
                    ))}
                    {participants.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>아직 입장한 참가자 없음</div>}
                </aside>

                {/* 우측: 글 목록 */}
                <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
                    {gameStatus === 'waiting' && (
                        <div style={{ textAlign: 'center', marginTop: 80, color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                            <div>상단의 [게임 시작]을 눌러주세요.</div>
                            <div style={{ fontSize: 13, marginTop: 8, color: 'rgba(255,255,255,0.2)' }}>참가자들이 300자 이내의 글을 작성합니다.</div>
                        </div>
                    )}

                    {(gameStatus === 'playing' || gameStatus === 'ended') && (
                        <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: 0.5 }}>
                                {gameStatus === 'playing' ? '📝 실시간 등록된 글' : '🗳️ 투표 진행 중 — 하트 실시간 집계'}
                            </div>
                            {posts.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14, marginTop: 60 }}>
                                    아직 등록된 글이 없습니다...
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {posts.map((post, idx) => (
                                    <PostCard key={post.postId} post={post} index={idx} />
                                ))}
                            </div>
                            <div ref={postsEndRef} />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

function PostCard({ post, index }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 16,
            padding: '16px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            transition: 'all 0.3s ease',
            animation: 'fadeInUp 0.3s ease',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, marginBottom: 6 }}>{post.nickname}</div>
                <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.65, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{post.text}</div>
            </div>
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                minWidth: 52, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)'
            }}>
                <span style={{ fontSize: 20 }}>🤍</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: '#fb7185' }}>{post.hearts}</span>
            </div>
        </div>
    );
}

function btnStyle(bg, color, border) {
    return {
        display: 'flex', alignItems: 'center', gap: 6,
        background: bg, color, border: `1px solid ${border || 'transparent'}`,
        padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
        fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
        whiteSpace: 'nowrap'
    };
}
