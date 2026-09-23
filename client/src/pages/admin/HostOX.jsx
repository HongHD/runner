import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

export default function HostOX() {
    const { id: gameId } = useParams();
    const navigate = useNavigate();
    const { token, admin } = useAuthStore();
    const { setSocket } = useGameStore();

    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting | playing | revealed | ended
    const [currentQ, setCurrentQ] = useState(-1); // -1 = 아직 시작 전
    const [timer, setTimer] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [answerStatus, setAnswerStatus] = useState({}); // { participantId: answer }
    const [revealedAnswer, setRevealedAnswer] = useState(null);
    const [finalScores, setFinalScores] = useState(null);

    const timerRef = useRef(null);
    const persistentPin = admin?.pinCode || '';
    const apiHeaders = { Authorization: `Bearer ${token}` };

    // 게임 데이터 로드
    useEffect(() => {
        axios.get(`/api/games/${gameId}`, { headers: apiHeaders })
            .then(res => setGame(res.data))
            .catch(() => alert('게임 데이터를 불러올 수 없습니다.'))
            .finally(() => setLoading(false));
    }, [gameId]);

    // 소켓 설정
    useEffect(() => {
        if (!admin?.pinCode) return;
        const sock = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = sock;
        setSocket(sock);

        if (sock.connected) {
            sock.emit('admin_join', { pinCode: persistentPin, adminId: admin.id, gameId, gameType: 'ox' });
        }
        sock.on('connect', () => {
            sock.emit('admin_join', { pinCode: persistentPin, adminId: admin.id, gameId, gameType: 'ox' });
        });

        sock.on('online_participants', (data) => {
            setParticipants((data.participants || []).map(p => ({ ...p })));
        });
        sock.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    if (prev.find(p => p.id === data.participant.id)) return prev;
                    return [...prev, data.participant];
                });
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        sock.on('ox_answer_received', (data) => {
            setAnswerStatus(prev => ({ ...prev, [data.participantId]: data.answer }));
        });

        sock.on('ox_revealed', (data) => {
            setRevealedAnswer(data.correctAnswer);
            setGameStatus('revealed');
        });

        sock.on('ox_final_scores', (data) => {
            setFinalScores(data);
            setGameStatus('ended');
        });

        return () => {
            sock.off('online_participants');
            sock.off('participant_update');
            sock.off('ox_answer_received');
            sock.off('ox_revealed');
            sock.off('ox_final_scores');
            sock.off('connect');
        };
    }, [admin?.pinCode, gameId]);

    const sock = () => window._adminSocket;

    const startGame = () => {
        sock().emit('admin_start_game', { pinCode: persistentPin, gameId });
        setGameStatus('playing');
        // game_started 이벤트가 플레이어에게 먼저 도달하도록 약간 지연 후 첫 문제 전송
        setTimeout(() => sendQuestion(0), 500);
    };

    const sendQuestion = (idx) => {
        setCurrentQ(idx);
        setAnswerStatus({});
        setRevealedAnswer(null);
        setGameStatus('playing');
        const questions = game?.Questions || [];
        const tl = (questions[idx]?.time_limit || 5);
        sock().emit('admin_ox_next_question', { pinCode: persistentPin, questionIndex: idx, gameId: parseInt(gameId) });
        startTimer(tl);
    };

    const startTimer = (seconds) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimer(seconds);
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const revealAnswer = () => {
        const questions = game?.Questions || [];
        const q = questions[currentQ];
        if (!q) return;
        const correctOpt = (q.Options || []).find(o => o.is_correct);
        const correctAnswer = correctOpt ? correctOpt.option_text : 'O';
        sock().emit('admin_ox_reveal', { pinCode: persistentPin, questionIndex: currentQ, correctAnswer });
        if (timerRef.current) clearInterval(timerRef.current);
        setTimer(0);
    };

    const nextQuestion = () => {
        const questions = game?.Questions || [];
        if (currentQ + 1 < questions.length) {
            sendQuestion(currentQ + 1);
        }
    };

    const endGame = () => {
        if (!window.confirm('게임을 종료하고 점수를 집계하시겠습니까?')) return;
        if (timerRef.current) clearInterval(timerRef.current);
        sock().emit('admin_ox_end', { pinCode: persistentPin });
    };

    if (loading) return <div style={{ padding: 40, color: '#fff' }}>게임 로딩 중...</div>;
    if (!game) return <div style={{ padding: 40, color: '#fff' }}>게임을 찾을 수 없습니다.</div>;

    const questions = game.Questions || [];
    const currentQuestion = questions[currentQ];
    const answeredCount = Object.keys(answerStatus).length;

    // 최종 점수 화면
    if (gameStatus === 'ended' && finalScores) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🏆 OX퀴즈 최종 결과</h1>
                    <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/games') }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>나가기</button>
                </header>
                <div style={{ display: 'flex', gap: 24, padding: 32, flex: 1 }}>
                    {/* 개인 순위 */}
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--rvd-cyan, #00d4ff)', marginBottom: 16 }}>📋 개인 순위</h2>
                        {finalScores.leaderboard.map((p, i) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 8, background: i < 3 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}</span>
                                <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                                {p.team && <span style={{ fontSize: 11, color: '#c084fc', background: 'rgba(192,132,252,0.12)', padding: '2px 8px', borderRadius: 4 }}>{p.team}팀</span>}
                                <span style={{ fontWeight: 800, color: '#4ade80', minWidth: 40, textAlign: 'right' }}>{p.score}점</span>
                            </div>
                        ))}
                    </div>
                    {/* 팀 순위 */}
                    {finalScores.teamLeaderboard.length > 0 && (
                        <div style={{ width: 260, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 }}>
                            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#c084fc', marginBottom: 16 }}>👥 팀 순위</h2>
                            {finalScores.teamLeaderboard.map((t, i) => (
                                <div key={t.team} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(192,132,252,0.07)', marginBottom: 6, border: '1px solid rgba(192,132,252,0.15)' }}>
                                    <span style={{ fontWeight: 700 }}>{i + 1}. {t.team}팀</span>
                                    <span style={{ fontWeight: 800, color: '#c084fc' }}>{t.score}점</span>
                                </div>
                            ))}
                        </div>
                    )}
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
                        OX퀴즈 호스트
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>PIN: {persistentPin}</span>
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.8)', marginTop: 3 }}>{game.title} · {questions.length}문제</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {gameStatus === 'waiting' && (
                        <button onClick={startGame} disabled={questions.length === 0} style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            ▶ 게임 시작
                        </button>
                    )}
                    {(gameStatus === 'playing' || gameStatus === 'revealed') && (
                        <>
                            {gameStatus === 'playing' && (
                                <button onClick={revealAnswer} style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                    정답 공개
                                </button>
                            )}
                            {gameStatus === 'revealed' && currentQ + 1 < questions.length && (
                                <button onClick={nextQuestion} style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                    다음 문제 ▶
                                </button>
                            )}
                            <button onClick={endGame} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                종료 및 집계
                            </button>
                        </>
                    )}
                    <button onClick={() => { if (window._adminSocket) window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin }); navigate('/admin/games') }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>나가기</button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, gap: 0 }}>
                {/* 메인: 문제 표시 */}
                <main style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {gameStatus === 'waiting' ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 60, marginBottom: 16 }}>📋</div>
                            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>게임 준비 완료</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>참가자가 입장하면 [게임 시작] 버튼을 클릭하세요.</div>
                            <div style={{ marginTop: 24, fontSize: 13, color: 'rgba(0,212,255,0.6)' }}>총 {questions.length}문제 · 참가자 {participants.length}명</div>
                        </div>
                    ) : currentQuestion ? (
                        <div style={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>
                            {/* 문제 번호 & 타이머 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>문제 {currentQ + 1} / {questions.length}</span>
                                {gameStatus === 'playing' && (
                                    <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, border: `3px solid ${timer <= 2 ? '#ef4444' : '#4ade80'}`, color: timer <= 2 ? '#ef4444' : '#4ade80', transition: 'all 0.3s' }}>
                                        {timer}
                                    </div>
                                )}
                            </div>

                            {/* 문제 텍스트 */}
                            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.5, padding: '32px 40px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 28 }}>
                                {currentQuestion.question_text}
                            </div>

                            {/* 정답 공개 결과 */}
                            {gameStatus === 'revealed' && revealedAnswer && (
                                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
                                    {['O', 'X'].map(opt => (
                                        <div key={opt} style={{
                                            width: 120, height: 120, borderRadius: 16,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 56, fontWeight: 900,
                                            background: opt === revealedAnswer ? (opt === 'O' ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)') : 'rgba(255,255,255,0.03)',
                                            border: `3px solid ${opt === revealedAnswer ? (opt === 'O' ? '#3b82f6' : '#ef4444') : 'rgba(255,255,255,0.08)'}`,
                                            color: opt === revealedAnswer ? (opt === 'O' ? '#3b82f6' : '#ef4444') : 'rgba(255,255,255,0.2)',
                                            boxShadow: opt === revealedAnswer ? `0 0 30px ${opt === 'O' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}` : 'none',
                                            scale: opt === revealedAnswer ? '1.05' : '1',
                                            transition: 'all 0.3s'
                                        }}>
                                            {opt} {opt === revealedAnswer && '✓'}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 답변 현황 */}
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                                {answeredCount} / {participants.length} 명 답변 완료
                            </div>
                        </div>
                    ) : null}
                </main>

                {/* 사이드: 참가자 목록 */}
                <aside style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px', overflowY: 'auto' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 12 }}>
                        참가자 ({participants.length}명)
                    </div>
                    {participants.map(p => {
                        const ans = answerStatus[p.id];
                        return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4ff,#004466)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                                    {(p.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                                    {p.team && <div style={{ fontSize: 10, color: '#c084fc' }}>{p.team}팀</div>}
                                </div>
                                {ans && (
                                    <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, background: ans === 'O' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', color: ans === 'O' ? '#3b82f6' : '#ef4444', border: `1px solid ${ans === 'O' ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}` }}>
                                        {ans}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </aside>
            </div>
        </div>
    );
}
