import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

const MAX_CHARS = 300;
const MAX_HEARTS = 3;

export default function PlayEmpathyVote() {
    const { socket, setSocket, pinCode, nickname, participantId, resetGame } = useGameStore();
    const navigate = useNavigate();
    const location = useLocation();

    // 상태: writing | submitted | voting | voted | ranking
    const [phase, setPhase] = useState('writing');
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [myPostId, setMyPostId] = useState(null);

    // 투표 단계
    const [posts, setPosts] = useState([]); // { postId, text, nickname, participantId, hearts }
    const [heartedPosts, setHeartedPosts] = useState(new Set()); // 하트 누른 postId set
    const [heartCount, setHeartCount] = useState(0);
    const [rankingData, setRankingData] = useState([]);

    const votingRef = useRef(false);

    useEffect(() => {
        if (!socket) {
            if (window._playerSocket && (window._playerSocket.connected || window._playerSocket.connecting)) {
                setSocket(window._playerSocket);
                return;
            }
            if (pinCode && nickname) {
                const newSocket = io();
                window._playerSocket = newSocket;
                setSocket(newSocket);
                newSocket.on('connect', () => {
                    newSocket.emit('player_join', { pinCode, nickname, participantId });
                });
                newSocket.on('join_success', () => { });
                newSocket.on('join_error', (data) => {
                    alert(data.message);
                    window._playerSocket = null;
                    resetGame();
                    navigate('/play');
                });
                return;
            } else {
                navigate('/play');
                return;
            }
        }

        // 게임 시작 (로비 → 이미 진입한 경우)
        const onGameStarted = () => {
            setPhase('writing');
            setText('');
            setMyPostId(null);
            setHeartedPosts(new Set());
            setHeartCount(0);
            setPosts([]);
        };

        // 게임 종료 → 모든 글 공개, 투표 시작
        const onReveal = (data) => {
            setPosts(data.posts || []);
            setPhase('voting');
            votingRef.current = true;
        };

        // 제출 성공
        const onSubmitSuccess = (data) => {
            setMyPostId(data.postId);
            setPhase('submitted');
            setSubmitting(false);
        };

        // 제출 오류
        const onSubmitError = (data) => {
            alert(data.message);
            setSubmitting(false);
        };

        // 하트 성공 (내가 누른 결과 반영)
        const onHeartOk = (data) => {
            setHeartedPosts(prev => {
                const next = new Set(prev);
                if (data.isRemoved) {
                    next.delete(data.postId);
                } else {
                    next.add(data.postId);
                }
                return next;
            });
            setHeartCount(prev => data.isRemoved ? prev - 1 : prev + 1);
            // 해당 포스트 하트 수 로컬 업데이트
            setPosts(prev => prev.map(p =>
                p.postId === data.postId ? { ...p, hearts: data.hearts } : p
            ));
        };

        const onHeartError = (data) => {
            alert(data.message);
        };

        // 강제 로그아웃
        const onForceLogout = () => {
            socket.disconnect();
            resetGame();
            navigate('/play');
        };

        // 순위 데이터
        const onPlayerRanking = (data) => {
            setRankingData(data.ranking || []);
            setPhase('ranking');
        };

        // game_ended는 공감투표에서는 voting 상태로 전환됨 (reveal이 먼저 오므로 무시)
        const onGameEnded = () => {
            if (!votingRef.current) {
                setPhase('voting');
            }
        };

        const onAdminLeft = () => navigate('/play/lobby');
        const onShowRanking = () => { };

        socket.on('game_started', onGameStarted);
        socket.on('empathy_vote_reveal', onReveal);
        socket.on('empathy_submit_success', onSubmitSuccess);
        socket.on('empathy_submit_error', onSubmitError);
        socket.on('empathy_heart_ok', onHeartOk);
        socket.on('empathy_heart_error', onHeartError);
        socket.on('force_logout_user', onForceLogout);
        socket.on('admin_left', onAdminLeft);
        socket.on('game_ended', onGameEnded);
        socket.on('player_ranking_data', onPlayerRanking);
        socket.on('show_ranking', onShowRanking);

        return () => {
            socket.off('game_started', onGameStarted);
            socket.off('empathy_vote_reveal', onReveal);
            socket.off('empathy_submit_success', onSubmitSuccess);
            socket.off('empathy_submit_error', onSubmitError);
            socket.off('empathy_heart_ok', onHeartOk);
            socket.off('empathy_heart_error', onHeartError);
            socket.off('force_logout_user', onForceLogout);
            socket.off('admin_left', onAdminLeft);
            socket.off('game_ended', onGameEnded);
            socket.off('player_ranking_data', onPlayerRanking);
            socket.off('show_ranking', onShowRanking);
        };
    }, [socket, navigate, resetGame, pinCode, nickname, participantId, setSocket]);

    const handleSubmit = () => {
        if (!socket || submitting || !text.trim()) return;
        setSubmitting(true);
        socket.emit('player_empathy_submit', { pinCode, text: text.trim() });
    };

    const handleHeart = (postId) => {
        if (!socket) return;
        const isAlreadyHearted = heartedPosts.has(postId);
        if (!isAlreadyHearted && heartCount >= MAX_HEARTS) {
            alert(`하트는 최대 ${MAX_HEARTS}개까지만 누를 수 있습니다.`);
            return;
        }
        socket.emit('player_empathy_heart', { pinCode, postId });
    };

    // ── 글 작성 화면 ──
    if (phase === 'writing') {
        const remaining = MAX_CHARS - text.length;
        const isOver = remaining < 0;
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>공감투표</h2>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>마음을 담아 글을 작성해 주세요.</p>
                        <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4, fontWeight: 600 }}>{nickname}</div>
                    </div>

                    <textarea
                        value={text}
                        onChange={e => {
                            if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
                        }}
                        placeholder="여기에 글을 입력하세요... (최대 300자)"
                        maxLength={MAX_CHARS}
                        rows={6}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isOver ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
                            borderRadius: 12, color: '#e2e8f0', fontSize: 15,
                            padding: '14px 16px', resize: 'none', outline: 'none',
                            lineHeight: 1.65, fontFamily: 'inherit',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: isOver ? '#ef4444' : remaining <= 50 ? '#fbbf24' : '#64748b' }}>
                            {remaining}자 남음
                        </span>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !text.trim() || isOver}
                            style={{
                                background: submitting || !text.trim() || isOver ? 'rgba(99,102,241,0.3)' : '#6366f1',
                                color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px',
                                fontWeight: 700, fontSize: 15, cursor: submitting || !text.trim() || isOver ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {submitting ? '등록 중...' : '등록'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 제출 완료 대기 화면 ──
    if (phase === 'submitted') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#4ade80', margin: '0 0 10px 0' }}>등록 완료!</h2>
                        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>
                            글이 등록되었습니다.<br />
                            호스트가 게임을 종료하면<br />
                            다른 분들의 글에 하트를 누를 수 있습니다.
                        </p>
                        {text && (
                            <div style={{
                                marginTop: 20, padding: '14px 16px', background: 'rgba(255,255,255,0.05)',
                                borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                                fontSize: 14, color: '#e2e8f0', textAlign: 'left', lineHeight: 1.6,
                                wordBreak: 'break-all', whiteSpace: 'pre-wrap'
                            }}>
                                {text}
                            </div>
                        )}
                        <div style={{ marginTop: 20 }}>
                            <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                        </div>
                        <p style={{ fontSize: 12, color: '#475569', marginTop: 12 }}>투표 시작을 기다리는 중...</p>
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── 공감 투표 화면 ──
    if (phase === 'voting') {
        const remainingHearts = MAX_HEARTS - heartCount;
        return (
            <div style={{ minHeight: '100vh', background: '#0f0f1e', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                {/* 상단 고정 헤더 */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 10,
                    background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>❤️ 공감 투표</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{nickname}</div>
                    </div>
                    <div style={{
                        background: remainingHearts > 0 ? 'rgba(251,113,133,0.1)' : 'rgba(100,116,139,0.1)',
                        border: `1px solid ${remainingHearts > 0 ? 'rgba(251,113,133,0.3)' : 'rgba(100,116,139,0.3)'}`,
                        borderRadius: 20, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <span style={{ fontSize: 18 }}>{remainingHearts > 0 ? '🤍' : '❤️'}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: remainingHearts > 0 ? '#fb7185' : '#64748b' }}>
                            남은 하트 {remainingHearts}개
                        </span>
                    </div>
                </div>

                {/* 글 목록 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
                    {posts.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 60 }}>
                            등록된 글이 없습니다.
                        </div>
                    )}
                    {posts.map((post) => {
                        const isMyPost = post.participantId === participantId;
                        const isHearted = heartedPosts.has(post.postId);
                        // 이미 하트 누른 경우 취소 허용도 �, 본인 글의 경우만 캡음
                        const canHeart = !isMyPost && (isHearted || heartCount < MAX_HEARTS);

                        return (
                            <div key={post.postId} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 14,
                                padding: '16px 16px', borderRadius: 14, marginBottom: 12,
                                background: isMyPost ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isMyPost ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {isMyPost && (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            fontSize: 11, color: '#818cf8', fontWeight: 700,
                                            background: 'rgba(99,102,241,0.15)', borderRadius: 6,
                                            padding: '2px 8px', marginBottom: 6
                                        }}>✏️ 나의 글</div>
                                    )}
                                    <div style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.65, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                                        {post.text}
                                    </div>
                                </div>
                                <button
                                    onClick={() => canHeart && handleHeart(post.postId)}
                                    disabled={!canHeart}
                                    title={isMyPost ? '본인의 글에는 하트를 누르지 못합니다' : isHearted ? '하트 취소' : heartCount >= MAX_HEARTS ? '하트 3개 모두 사용' : '하트'}
                                    style={{
                                        flexShrink: 0, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 4, minWidth: 52,
                                        padding: '10px 12px', borderRadius: 10,
                                        background: isHearted ? 'rgba(239,68,68,0.12)' : isMyPost ? 'rgba(100,116,139,0.05)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isHearted ? 'rgba(239,68,68,0.4)' : isMyPost ? 'rgba(100,116,139,0.15)' : 'rgba(255,255,255,0.1)'}`,
                                        cursor: canHeart ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                        transform: 'scale(1)',
                                    }}
                                    onMouseEnter={e => { if (canHeart) e.currentTarget.style.transform = 'scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <span style={{ fontSize: 22, lineHeight: 1 }}>
                                        {isHearted ? '❤️' : '🤍'}
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: isHearted ? '#f87171' : '#64748b', display: 'none' }}>
                                        {post.hearts}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 안내 */}
                <div style={{
                    position: 'sticky', bottom: 0, background: 'rgba(15,15,30,0.95)',
                    backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.07)',
                    padding: '12px 20px', textAlign: 'center',
                    fontSize: 12, color: '#475569'
                }}>
                    {heartCount < MAX_HEARTS
                        ? `본인 글 제외, 마음에 드는 글에 하트를 누르세요. (${MAX_HEARTS - heartCount}개 남음)`
                        : '하트를 모두 사용했습니다. 결과를 기다려주세요.'}
                </div>
            </div>
        );
    }

    // ── 랭킹 화면 ──
    if (phase === 'ranking') {
        const myRankEntry = rankingData.find(p => p.id === participantId || p.name === nickname);
        return (
            <div style={pageStyle}>
                <div style={{ width: '100%', maxWidth: 480 }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 40 }}>🏆</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>공감투표 결과</h2>
                        <p style={{ fontSize: 13, color: '#64748b' }}>하트를 가장 많이 받은 글 순위예요!</p>
                    </div>

                    {/* 내 순위 배너 */}
                    {myRankEntry && (
                        <div style={{
                            marginBottom: 20, padding: '14px 20px', borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))',
                            border: '1px solid rgba(99,102,241,0.4)',
                            display: 'flex', alignItems: 'center', gap: 12
                        }}>
                            <span style={{ fontSize: 28 }}>{myRankEntry.rank === 1 ? '🥇' : myRankEntry.rank === 2 ? '🥈' : myRankEntry.rank === 3 ? '🥉' : '🏅'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, marginBottom: 2 }}>✨ 내 순위</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                                    {myRankEntry.rank}위
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginLeft: 8 }}>❤️ {myRankEntry.hearts}개</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {rankingData.map((p, i) => {
                        const isMe = p.id === participantId || p.name === nickname;
                        return (
                            <div key={p.postId || i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 14,
                                padding: '14px 18px', borderRadius: 14, marginBottom: 10,
                                background: isMe ? 'rgba(99,102,241,0.1)' : p.rank <= 3 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isMe ? 'rgba(99,102,241,0.4)' : p.rank === 1 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`
                            }}>
                                <span style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>
                                    {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}`}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, color: isMe ? '#818cf8' : '#a5b4fc', fontWeight: 700, marginBottom: 4 }}>
                                        {p.name} {isMe && <span style={{
                                            background: 'rgba(99,102,241,0.2)', color: '#818cf8',
                                            borderRadius: 4, padding: '1px 6px', fontSize: 10
                                        }}>나</span>}
                                    </div>
                                    <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{p.text}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 44 }}>
                                    <span style={{ fontSize: 20 }}>❤️</span>
                                    <span style={{ fontWeight: 800, fontSize: 16, color: '#fb7185' }}>{p.hearts}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── 대기/기본 화면 ──
    return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#64748b', fontSize: 14 }}>호스트를 기다리는 중...</p>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const pageStyle = {
    minHeight: '100vh', background: '#0f0f1e', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '24px 16px'
};

const cardStyle = {
    width: '100%', maxWidth: 480,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '32px 28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
};
