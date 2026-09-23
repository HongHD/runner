import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

const COLORS = [
    { id: 'yellow', hex: '#fef08a' }, // Default post-it color
    { id: 'pink', hex: '#fbcfe8' },
    { id: 'blue', hex: '#bfdbfe' },
    { id: 'green', hex: '#bbf7d0' },
    { id: 'orange', hex: '#fed7aa' }
];

export default function PlaySurvey() {
    const {
        socket, setSocket, pinCode, nickname, participantId, resetGame,
        team, setTeam, gameTitle
    } = useGameStore();
    const navigate = useNavigate();

    const [playerState, setPlayerState] = useState('playing'); // waiting, playing
    const [noteContent, setNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
    const [isSubmitted, setIsSubmitted] = useState(false);

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
                    newSocket.emit('player_join', {
                        pinCode,
                        nickname,
                        participantId: useGameStore.getState().participantId
                    });
                });

                newSocket.on('join_success', (data) => {
                    useGameStore.getState().setSessionInfo(data.participantId, data.sessionId, data.gameTitle);
                    useGameStore.getState().setTeam(data.team);

                    if (data.sessionStatus === 'waiting') {
                        navigate('/play/lobby');
                    } else if (data.sessionStatus === 'finished') {
                        setPlayerState('waiting');
                    } else if (data.sessionStatus === 'active') {
                        setPlayerState('playing');
                    }
                });

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

        const onForceLogout = () => {
            socket.disconnect();
            resetGame();
            navigate('/play');
        };

        const onGameEnded = () => {
            setPlayerState('waiting');
            setIsSubmitted(false);
            setNoteContent('');
        };

        const onGameStarted = (data) => {
            const title = data.gameTitle || gameTitle;
            if (data?.sessionId) {
                useGameStore.getState().setSessionInfo(
                    useGameStore.getState().participantId,
                    data.sessionId,
                    title
                );
            }
            if (title !== '실시간 설문') {
                navigate('/play/game');
            } else {
                setPlayerState('playing');
                setIsSubmitted(false);
                setNoteContent('');
            }
        };

        const onAdminLeft = () => {
            navigate('/play/lobby');
        };

        const onNoteSuccess = () => {
            setIsSubmitted(true);
        };

        const onNoteError = (data) => {
            alert(data.message || '오류가 발생했습니다.');
        };

        socket.on('force_logout_user', onForceLogout);
        socket.on('game_ended', onGameEnded);
        socket.on('game_started', onGameStarted);
        socket.on('admin_left', onAdminLeft);
        socket.on('note_submit_success', onNoteSuccess);
        socket.on('note_submit_error', onNoteError);

        socket.on('teams_updated', (data) => {
            if (data.assignments) {
                const myAssignment = data.assignments.find(a => a.participantId === participantId);
                if (myAssignment) {
                    setTeam(myAssignment.team);
                }
            }
        });

        return () => {
            socket.off('force_logout_user', onForceLogout);
            socket.off('game_ended', onGameEnded);
            socket.off('game_started', onGameStarted);
            socket.off('admin_left', onAdminLeft);
            socket.off('note_submit_success', onNoteSuccess);
            socket.off('note_submit_error', onNoteError);
            socket.off('teams_updated');
        };
    }, [socket, navigate, resetGame, participantId, setTeam, pinCode, nickname, gameTitle]);

    const handleSubmitNote = (e) => {
        e.preventDefault();
        if (!noteContent.trim()) {
            alert('내용을 입력해주세요!');
            return;
        }

        if (!socket || playerState !== 'playing') return;

        socket.emit('player_submit_note', {
            pinCode,
            content: noteContent.trim(),
            color: selectedColor,
            x: Math.random() * 70 + 10, // 10% ~ 80% to keep it within view
            y: Math.random() * 70 + 10
        });
    };

    if (playerState === 'waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full animate-fade-in-up">
                    <div className="text-6xl mb-6">⏳</div>
                    <h2 className="text-2xl font-bold mb-4 text-white">설문 대기중</h2>
                    <p className="text-slate-300">
                        호스트가 설문을 조작하고 있습니다.<br />결과를 확인해주세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-slate-100 overflow-hidden relative">
            {/* Header */}
            <header className="flex justify-between items-center mb-10">
                <div className="bg-slate-800 px-4 py-2 rounded-xl font-mono text-sm border border-slate-700">
                    PIN: {pinCode}
                </div>
                <div className="flex items-center gap-2">
                    {team && (
                        <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/30">
                            {team}팀
                        </div>
                    )}
                    <div className="bg-slate-800 px-4 py-2 rounded-xl font-bold border border-slate-700">
                        {nickname}
                    </div>
                </div>
            </header>

            <div className="w-full max-w-md mx-auto animate-fade-in-up flex flex-col space-y-8 flex-1">
                <div className="text-center">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        의견 남기기
                    </h1>
                    <p className="text-slate-400 font-medium">
                        작성한 메모가 전광판에 바로 표시됩니다!
                    </p>
                </div>

                {isSubmitted ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center mt-8 shadow-xl">
                        <div className="text-5xl mb-6">✨</div>
                        <h2 className="text-2xl font-bold text-blue-400 mb-3">전송 완료!</h2>
                        <p className="text-slate-300 text-base mb-8">
                            의견이 성공적으로 보드에 등록되었습니다.
                        </p>
                        <button
                            onClick={() => { setIsSubmitted(false); setNoteContent(''); }}
                            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg"
                        >
                            하나 더 작성하기
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitNote} className="space-y-6 flex-1 flex flex-col">
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex-1 flex flex-col max-h-[400px] border border-slate-200" style={{ backgroundColor: selectedColor }}>
                            <div className="p-4 border-b border-black/5 flex justify-center gap-4 bg-white/40">
                                {COLORS.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelectedColor(c.hex)}
                                        className={`w-10 h-10 rounded-full shadow-sm border-2 transition-transform ${selectedColor === c.hex ? 'border-slate-800 scale-110 shadow-md' : 'border-black/10 scale-100 hover:scale-105'}`}
                                        style={{ backgroundColor: c.hex }}
                                        aria-label={`${c.id} color`}
                                    />
                                ))}
                            </div>
                            <textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="여기에 의견을 자유롭게 적어주세요..."
                                className="w-full flex-1 p-6 bg-transparent text-slate-800 placeholder-slate-800/40 outline-none resize-none font-bold text-lg"
                                style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
                                required
                                maxLength={200}
                            />
                            <div className="text-right p-4 pt-0 text-slate-800/60 text-sm font-bold bg-white/10">
                                {noteContent.length} / 200
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg active:translate-y-1 transition-all text-xl"
                        >
                            전송하기
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

