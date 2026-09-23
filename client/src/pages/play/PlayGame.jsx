import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import LuckyDrawCanvas from '../../components/game/LuckyDrawCanvas';

export default function PlayGame() {
    const {
        socket, setSocket, pinCode, nickname, participantId, resetGame,
        team, setTeam, gameType
    } = useGameStore();
    const navigate = useNavigate();

    const location = useLocation();

    // gameType이 'ox'면 시작부터 OX 대기 화면으로
    const [playerState, setPlayerState] = useState(() => {
        const type = useGameStore.getState().gameType;
        if (type === 'ox') return 'ox_waiting';
        if (type === 'multiple_choice') return 'mc_waiting';
        if (type === 'mole') return 'mole_waiting';
        if (type === 'stopwatch') return 'stopwatch_waiting';
        if (type === 'button_battle') return 'bb_waiting';
        if (type === 'word_cloud') return 'wc_waiting';
        if (type === 'lucky_draw') return 'lucky_draw_waiting';
        return 'playing'; // default to buzzer
    });
    const [rank, setRank] = useState(null);
    const [elapsedMs, setElapsedMs] = useState(null);
    const [isBuzzed, setIsBuzzed] = useState(false);

    // OX Quiz 상태
    const [oxQuestion, setOxQuestion] = useState(null); // { questionText, questionIndex, total }
    const [oxTimer, setOxTimer] = useState(0);
    const [oxAnswered, setOxAnswered] = useState(false);
    const [oxMyAnswer, setOxMyAnswer] = useState(null);
    const [oxResult, setOxResult] = useState(null); // { correctAnswer, yourAnswer, isCorrect }
    const [oxGameOver, setOxGameOver] = useState(null); // { score, rank, total }
    const timerRef = useRef(null);

    // MC 퀴즈 상태
    const [mcQuestion, setMcQuestion] = useState(null);
    const [mcTimer, setMcTimer] = useState(0);
    const [mcAnswered, setMcAnswered] = useState(false);
    const [mcMyAnswer, setMcMyAnswer] = useState(null);
    const [mcResult, setMcResult] = useState(null);
    const [mcGameOver, setMcGameOver] = useState(null);
    const mcTimerRef = useRef(null);

    // 행운권 추첨 상태
    const [luckyDrawResult, setLuckyDrawResult] = useState(null);
    const [ldParticipants, setLdParticipants] = useState([]);
    const [ldDrawState, setLdDrawState] = useState('ready');
    const [ldWinner, setLdWinner] = useState(null);
    const [ldPreviousWinners, setLdPreviousWinners] = useState([]);

    // Mole Game 상태
    const [moleSettings, setMoleSettings] = useState(null);
    const [moleCountDown, setMoleCountDown] = useState(0);
    const [activeMoles, setActiveMoles] = useState(new Set());
    const [moleScore, setMoleScore] = useState(0);
    const [moleTimer, setMoleTimer] = useState(0);
    const moleTimerRef = useRef(null);
    const moleLoopRef = useRef(null);

    // Stopwatch Game 상태
    const [stopwatchSettings, setStopwatchSettings] = useState(null);
    const [stopwatchRunningMs, setStopwatchRunningMs] = useState(0);
    const [isStopwatchStopped, setIsStopwatchStopped] = useState(false);
    const stopwatchTimerRef = useRef(null);
    const stopwatchStartRef = useRef(0);

    // Button Battle 상태
    const [bbSettings, setBbSettings] = useState(null);
    const [bbScore, setBbScore] = useState(0);
    const [bbTimer, setBbTimer] = useState(0);
    const [bbCountDown, setBbCountDown] = useState(0);
    const [bbNextTarget, setBbNextTarget] = useState(0);
    const bbTimerRef = useRef(null);

    // Word Cloud 상태
    const [wcWords, setWcWords] = useState(['', '', '', '', '']);
    const [wcSubmitted, setWcSubmitted] = useState(false);

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
                    useGameStore.getState().setGameType(data.gameType);

                    if (data.sessionStatus === 'waiting') {
                        navigate('/play/lobby');
                    } else if (data.sessionStatus === 'finished') {
                        setPlayerState('waiting');
                    } else if (data.gameType === 'word_cloud') {
                        // 워드클라우드: 아직 제출 안 했으면 입력 화면, 제출했으면 대기 화면
                        setWcWords(['', '', '', '', '']);
                        setWcSubmitted(false);
                        setPlayerState('wc_input');
                    } else if (data.gameType === 'ox') {
                        setPlayerState('ox_waiting');
                    } else if (data.gameType === 'multiple_choice') {
                        setPlayerState('mc_waiting');
                    } else if (data.gameType === 'mole') {
                        setPlayerState('mole_playing');
                    } else if (data.gameType === 'button_battle') {
                        setPlayerState('bb_playing');
                    } else {
                        setPlayerState('playing');
                        if (data.rank) {
                            setRank(data.rank);
                            setElapsedMs(data.elapsedMs);
                            setIsBuzzed(true);
                        }
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

        const onForceLogout = () => { socket.disconnect(); resetGame(); navigate('/play'); };
        const onGameEnded = () => {
            if (moleTimerRef.current) clearInterval(moleTimerRef.current);
            if (moleLoopRef.current) clearInterval(moleLoopRef.current);
            if (bbTimerRef.current) clearInterval(bbTimerRef.current);
            if (bbCountdownTimerRef.current) clearInterval(bbCountdownTimerRef.current);
            setPlayerState(prev => prev === 'ox_game_over' || prev === 'mc_game_over' ? prev : 'waiting');
        };
        const onGameStarted = (data) => {
            const title = data.gameTitle || useGameStore.getState().gameTitle;
            const type = data.gameType;
            useGameStore.getState().setGameType(type);

            if (data?.sessionId) {
                useGameStore.getState().setSessionInfo(useGameStore.getState().participantId, data.sessionId, title);
            }
            // 상태 초기화
            setIsBuzzed(false);
            setRank(null);
            setElapsedMs(null);
            setOxQuestion(null);
            setOxAnswered(false);
            setOxMyAnswer(null);
            setOxResult(null);
            setOxGameOver(null);
            setMcQuestion(null);
            setMcAnswered(false);
            setMcMyAnswer(null);
            setMcResult(null);
            setMcGameOver(null);
            setBbScore(0);
            setLuckyDrawResult(null);
            setLdDrawState('ready');
            setLdWinner(null);

            if (title === '실시간 설문') {
                navigate('/play/survey');
            } else if (type === 'ox') {
                // OX 퀴즈: 문제가 올 때까지 대기 화면
                setPlayerState('ox_waiting');
            } else if (type === 'multiple_choice') {
                setPlayerState('mc_waiting');
            } else if (type === 'mole') {
                setMoleSettings(data.settings || { level: 1, difficulty: 'normal', duration: 30 });
                setMoleScore(0);
                startMoleGame(data.settings || { level: 1, difficulty: 'normal', duration: 30 });
            } else if (type === 'button_battle') {
                setBbSettings(data.settings || { difficulty: 1 });
                setBbScore(0);
                setBbNextTarget(0);
                startBbGame(data.settings || { difficulty: 1 });
            } else if (type === 'stopwatch') {
                setStopwatchSettings(data.settings || { targetTime: 10 });
                setStopwatchRunningMs(0);
                setIsStopwatchStopped(false);
                setPlayerState('stopwatch_playing');
                stopwatchStartRef.current = Date.now();
                stopwatchTimerRef.current = setInterval(() => {
                    setStopwatchRunningMs(Date.now() - stopwatchStartRef.current);
                }, 10);
            } else if (type === 'word_cloud') {
                setWcWords(['', '', '', '', '']);
                setWcSubmitted(false);
                setPlayerState('wc_input');
            } else if (type === 'lucky_draw') {
                if (data.participants) {
                    setLdParticipants(data.participants);
                }
                setPlayerState('lucky_draw_waiting');
            } else {
                setPlayerState('playing');
            }
        };
        const onShowRanking = () => setPlayerState('ranking');
        const onBuzzerResult = (data) => { setRank(data.rank); setElapsedMs(data.elapsedMs); setIsBuzzed(true); };
        const onAdminLeft = () => navigate('/play/lobby');

        // ── Speed Piano 이벤트 ──
        // ── OX 퀴즈 이벤트 ──
        const onOxQuestion = (data) => {
            clearOxTimer();
            setOxQuestion(data);
            setOxAnswered(false);
            setOxMyAnswer(null);
            setOxResult(null);
            setPlayerState('ox_question');
            startOxTimer(data.timeLimit || 5);
        };
        const onOxResult = (data) => {
            clearOxTimer();
            setOxResult(data);
            setPlayerState('ox_result');
        };
        const onOxGameOver = (data) => {
            clearOxTimer();
            setOxGameOver(data);
            setPlayerState('ox_game_over');
        };

        // ── MC 퀴즈 이벤트 ──
        const onMcQuestion = (data) => {
            clearMcTimer();
            setMcQuestion(data);
            setMcAnswered(false);
            setMcMyAnswer(null);
            setMcResult(null);
            setPlayerState('mc_question');
            startMcTimer(data.timeLimit || 20);
        };
        const onMcResult = (data) => {
            clearMcTimer();
            setMcResult(data);
            setPlayerState('mc_result');
        };
        const onMcGameOver = (data) => {
            clearMcTimer();
            setMcGameOver(data);
            setPlayerState('mc_game_over');
        };

        socket.on('force_logout_user', onForceLogout);
        socket.on('game_ended', onGameEnded);
        socket.on('game_started', onGameStarted);
        socket.on('show_ranking', onShowRanking);
        socket.on('buzzer_result', onBuzzerResult);
        socket.on('admin_left', onAdminLeft);
        socket.on('ox_question', onOxQuestion);
        socket.on('ox_result', onOxResult);
        socket.on('ox_game_over', onOxGameOver);
        socket.on('mc_question', onMcQuestion);
        socket.on('mc_result', onMcResult);
        socket.on('mc_game_over', onMcGameOver);
        socket.on('player_ranking_data', (data) => {
            // 새 게임이 시작될 때 DB의 Participant ID가 변경될 수 있으므로 고유한 nickname으로 본인 랭킹을 찾습니다.
            const myRank = data.ranking.find(r => r.name === nickname || r.id === participantId);
            if (myRank) {
                setRank(myRank.rank);
                setElapsedMs(myRank.elapsedMs || null);
                if (myRank.score !== undefined && myRank.score !== null) {
                    setMoleScore(myRank.score);
                    setBbScore(myRank.score);
                }
            }
        });
        // 워드클라우드 제출 완료
        const onWcSubmitOk = () => {
            setWcSubmitted(true);
            setPlayerState('wc_submitted');
        };
        socket.on('word_cloud_submit_ok', onWcSubmitOk);

        // 행운권 추첨
        const onLuckyDrawPlayerResult = (data) => {
            setLdWinner(data.winner);
            setLdDrawState('mixing');

            // 호스트 화면의 섞기(3초) + 확대(1.5초) 애니메이션과 싱크를 맞춤
            setTimeout(() => {
                setLdDrawState('drawing');
                setTimeout(() => {
                    setLdDrawState('result');
                    setLuckyDrawResult(data);
                    setPlayerState('lucky_draw_result');
                }, 1500);
            }, 3000);
        };
        socket.on('lucky_draw_player_result', onLuckyDrawPlayerResult);

        socket.on('teams_updated', (data) => {
            if (data.assignments) {
                const myAssignment = data.assignments.find(a => a.participantId === participantId);
                if (myAssignment) setTeam(myAssignment.team);
            }
        });

        // 접속자 변동 시 참가자 목록 업데이트
        socket.on('player_joined', (data) => {
            setLdParticipants(prev => {
                if (prev.find(p => p.id === data.participantId)) return prev;
                return [...prev, {
                    id: data.participantId,
                    name: data.nickname,
                    team: data.team
                }];
            });
        });

        return () => {
            socket.off('force_logout_user', onForceLogout);
            socket.off('game_ended', onGameEnded);
            socket.off('game_started', onGameStarted);
            socket.off('show_ranking', onShowRanking);
            socket.off('buzzer_result', onBuzzerResult);
            socket.off('admin_left', onAdminLeft);
            socket.off('ox_question', onOxQuestion);
            socket.off('ox_result', onOxResult);
            socket.off('ox_game_over', onOxGameOver);
            socket.off('mc_question', onMcQuestion);
            socket.off('mc_result', onMcResult);
            socket.off('mc_game_over', onMcGameOver);
            socket.off('player_ranking_data');
            socket.off('teams_updated');
            socket.off('word_cloud_submit_ok', onWcSubmitOk);
            socket.off('lucky_draw_player_result', onLuckyDrawPlayerResult);
            socket.off('player_joined');
            if (moleTimerRef.current) clearInterval(moleTimerRef.current);
            if (moleLoopRef.current) clearInterval(moleLoopRef.current);
            if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
            if (mcTimerRef.current) clearInterval(mcTimerRef.current);
            if (bbTimerRef.current) clearInterval(bbTimerRef.current);
        };
    }, [socket, navigate, resetGame, participantId, setTeam]);

    const startOxTimer = (seconds) => {
        setOxTimer(seconds);
        timerRef.current = setInterval(() => {
            setOxTimer(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };
    const clearOxTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

    const handleOxAnswer = (answer) => {
        if (oxAnswered || playerState !== 'ox_question') return;
        setOxAnswered(true);
        setOxMyAnswer(answer);
        socket.emit('player_ox_answer', {
            pinCode,
            questionIndex: oxQuestion.questionIndex,
            answer
        });
    };

    const startMcTimer = (seconds) => {
        setMcTimer(seconds);
        mcTimerRef.current = setInterval(() => {
            setMcTimer(prev => {
                if (prev <= 1) { clearInterval(mcTimerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };
    const clearMcTimer = () => { if (mcTimerRef.current) clearInterval(mcTimerRef.current); };

    const handleMcAnswer = (answerText) => {
        if (mcAnswered || playerState !== 'mc_question') return;
        setMcAnswered(true);
        setMcMyAnswer(answerText);
        socket.emit('player_mc_answer', {
            pinCode,
            questionIndex: mcQuestion.questionIndex,
            answer: answerText
        });
    };

    const startMoleGame = (settings) => {
        setPlayerState('mole_countdown');
        setMoleCountDown(3);
        let cd = 3;

        const cTimer = setInterval(() => {
            cd--;
            setMoleCountDown(cd);
            if (cd === 0) {
                clearInterval(cTimer);
                setPlayerState('mole_playing');
                runMoleGameLoop(settings);
            }
        }, 1000);
    };

    const runMoleGameLoop = (settings) => {
        const duration = settings.duration || 30;
        setMoleTimer(duration);

        const level = settings.level || 1;
        const maxActiveMoles = Math.min(5, 1 + Math.floor(level / 3));

        let timeRemaining = duration;
        moleTimerRef.current = setInterval(() => {
            timeRemaining--;
            setMoleTimer(timeRemaining);
            if (timeRemaining <= 0) {
                clearInterval(moleTimerRef.current);
                if (moleLoopRef.current) clearInterval(moleLoopRef.current);
                setActiveMoles(new Set());
                // 이미 'ranking' 상태라면(관리자가 순위확인을 누른 경우) 덮어쓰지 않는다
                setPlayerState(prev => (prev === 'ranking' ? 'ranking' : 'waiting'));
            }
        }, 1000);

        const diffStr = settings.difficulty || 'normal';
        let speedInterval = diffStr === 'easy' ? 1200 : diffStr === 'hard' ? 600 : 900;
        speedInterval = Math.max(300, speedInterval - (level * 20));

        moleLoopRef.current = setInterval(() => {
            setActiveMoles(prev => {
                const next = new Set(prev);
                for (let item of next) {
                    if (Math.random() > 0.4) next.delete(item);
                }
                const addCount = maxActiveMoles - next.size;
                for (let i = 0; i < addCount; i++) {
                    const rnd = Math.floor(Math.random() * 9);
                    next.add(rnd);
                }
                return next;
            });
        }, speedInterval);
    };

    const handleMoleHit = (idx) => {
        if (!activeMoles.has(idx) || playerState !== 'mole_playing') return;

        setActiveMoles(prev => {
            const next = new Set(prev);
            next.delete(idx);
            return next;
        });

        setMoleScore(prev => prev + 1);
        socket.emit('player_mole_hit', { pinCode });
    };

    const bbCountdownTimerRef = useRef(null);

    const startBbGame = (settings) => {
        if (bbCountdownTimerRef.current) clearInterval(bbCountdownTimerRef.current);
        if (bbTimerRef.current) clearInterval(bbTimerRef.current);

        setPlayerState('bb_countdown');
        setBbCountDown(3);
        setBbNextTarget(0);
        let cd = 3;

        bbCountdownTimerRef.current = setInterval(() => {
            cd--;
            if (cd > 0) {
                setBbCountDown(cd);
            } else {
                clearInterval(bbCountdownTimerRef.current);
                setPlayerState('bb_playing');
                runBbGameLoop(settings);
            }
        }, 1000);
    };

    const runBbGameLoop = (settings) => {
        const duration = settings.difficulty === 3 ? 20 : settings.difficulty === 2 ? 15 : 10;
        setBbTimer(duration);

        let timeRemaining = duration;
        if (bbTimerRef.current) clearInterval(bbTimerRef.current);
        bbTimerRef.current = setInterval(() => {
            timeRemaining--;
            setBbTimer(timeRemaining);
            if (timeRemaining <= 0) {
                clearInterval(bbTimerRef.current);
                setPlayerState(prev => (prev === 'ranking' ? 'ranking' : 'waiting'));
            }
        }, 1000);
    };

    const handleBbClick = (targetIdx) => {
        if (playerState !== 'bb_playing') return;

        // 올바른 순서를 눌렀는지 체크
        if (targetIdx !== undefined && targetIdx !== bbNextTarget) {
            return; // 틀린 순서는 무시
        }

        const difficulty = bbSettings?.difficulty || 1;
        setBbNextTarget(prev => (prev + 1) % difficulty);

        setBbScore(prev => {
            const next = prev + 1;
            socket.emit('player_button_battle_score', { pinCode, score: next });
            return next;
        });
    };

    useEffect(() => {
        if (location.state?.fromLobby) {
            const type = location.state.type;
            if (type === 'mole') {
                setMoleSettings(location.state.settings || { level: 1, difficulty: 'normal', duration: 30 });
                setMoleScore(0);
                startMoleGame(location.state.settings || { level: 1, difficulty: 'normal', duration: 30 });
            } else if (type === 'button_battle') {
                setBbSettings(location.state.settings || { difficulty: 1 });
                setBbScore(0);
                startBbGame(location.state.settings || { difficulty: 1 });
            } else if (type === 'stopwatch') {
                setStopwatchSettings(location.state.settings || { targetTime: 10 });
                setStopwatchRunningMs(0);
                setIsStopwatchStopped(false);
                setPlayerState('stopwatch_playing');
                stopwatchStartRef.current = Date.now();
                stopwatchTimerRef.current = setInterval(() => {
                    setStopwatchRunningMs(Date.now() - stopwatchStartRef.current);
                }, 10);
            } else if (type === 'word_cloud') {
                setWcWords(['', '', '', '', '']);
                setWcSubmitted(false);
                setPlayerState('wc_input');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    const handleBuzzerClick = () => {
        if (!socket || isBuzzed || playerState !== 'playing') return;
        const { participantId: pid, sessionId } = useGameStore.getState();
        socket.emit('player_buzzer_click', { pinCode, participantId: pid, sessionId });
        setIsBuzzed(true);
    };

    const formatTime = (ms) => {
        if (!ms) return '00:00';
        const seconds = Math.floor(ms / 1000);
        const msDec = Math.floor((ms % 1000) / 10);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(seconds)}:${pad(msDec)}`;
    };

    const formatStopwatchTime = (ms) => {
        if (!ms && ms !== 0) return '00.00';
        const totalMs = Math.round(ms);
        const seconds = Math.floor(Math.abs(totalMs) / 1000);
        const msDec = Math.floor((Math.abs(totalMs) % 1000) / 10);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(seconds)}.${pad(msDec)}`;
    };

    const handleStopwatchStop = () => {
        if (!socket || isStopwatchStopped || playerState !== 'stopwatch_playing') return;
        const stopTime = Date.now();
        const stoppedMs = stopTime - stopwatchStartRef.current;
        clearInterval(stopwatchTimerRef.current);
        setStopwatchRunningMs(stoppedMs);
        setIsStopwatchStopped(true);

        socket.emit('player_stopwatch_stop', {
            pinCode,
            elapsedMs: stoppedMs
        });
    };

    // ── 대기 화면 ──
    if (playerState === 'waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center relative overflow-hidden">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full z-10">
                    <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-8"></div>
                    <h2 className="text-2xl font-bold mb-4 text-white">집계 중...</h2>
                    <p className="text-slate-400 font-medium">호스트가 결과를 확인 중입니다.<br />잠시만 기다려주세요...</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
            </div>
        );
    }

    // ── 워드클라우드 대기 (게임 시작 전) ──
    if (playerState === 'wc_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 0 16px rgba(96,165,250,0.5))' }}>☁️</div>
                <h2 className="text-3xl font-bold mb-3 text-white">워드클라우드</h2>
                <div className="mt-6 py-8 px-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-lg font-medium text-slate-300">
                        호스트가 곧 게임을 시작합니다!<br />잠시만 기다려주세요...
                    </p>
                </div>
            </div>
        );
    }

    // ── 워드클라우드 단어 입력 화면 ──
    if (playerState === 'wc_input') {
        const handleWcChange = (idx, val) => {
            setWcWords(prev => { const n = [...prev]; n[idx] = val; return n; });
        };
        const handleWcSubmit = () => {
            if (!socket) return;
            const filled = wcWords.filter(w => w.trim().length > 0);
            if (filled.length === 0) { alert('최소 1개 이상의 단어를 입력해주세요.'); return; }
            socket.emit('player_word_cloud_submit', { pinCode, words: filled });
        };
        const filledCount = wcWords.filter(w => w.trim().length > 0).length;

        return (
            <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100" style={{ overflowY: 'auto' }}>
                {/* 상단 바 */}
                <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="bg-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs border border-slate-700 text-slate-400">
                        PIN: {pinCode}
                    </div>
                    <div className="bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700">{nickname}</div>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6">
                    <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 12px rgba(96,165,250,0.4))' }}>☁️</div>
                    <h2 className="text-2xl font-black text-white mb-1">워드클라우드</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        떠오르는 단어를 최대 <span className="text-blue-400 font-bold">5개</span> 입력하세요
                    </p>

                    {/* 입력 필드 */}
                    <div className="w-full max-w-sm space-y-3 mb-7">
                        {wcWords.map((w, idx) => (
                            <div key={idx} className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm select-none">
                                    {idx + 1}
                                </span>
                                <input
                                    type="text"
                                    value={w}
                                    onChange={e => handleWcChange(idx, e.target.value)}
                                    maxLength={20}
                                    placeholder={idx === 0 ? '단어를 입력하세요' : `단어 ${idx + 1} (선택)`}
                                    disabled={wcSubmitted}
                                    className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-2xl pl-10 pr-4 py-3.5 text-white font-bold text-base outline-none transition-all placeholder:text-slate-600"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                    onKeyDown={e => { if (e.key === 'Enter' && idx < 4) { const next = document.getElementById(`wc-input-${idx + 1}`); if (next) next.focus(); } }}
                                    id={`wc-input-${idx}`}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 확인 버튼 */}
                    <button
                        onClick={handleWcSubmit}
                        disabled={filledCount === 0 || wcSubmitted}
                        className={`w-full max-w-sm py-4 rounded-2xl text-xl font-black transition-all ${filledCount === 0 || wcSubmitted
                            ? 'bg-slate-800 text-slate-500 border border-slate-700'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40 active:scale-95'
                            }`}
                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                    >
                        {filledCount === 0 ? '단어를 입력하세요' : `${filledCount}개 단어 제출하기`}
                    </button>

                    <p className="text-xs text-slate-600 mt-4 text-center">
                        입력하지 않은 칸은 자동으로 제외됩니다
                    </p>
                </div>
            </div>
        );
    }

    // ── 워드클라우드 제출 완료 화면 ──
    if (playerState === 'wc_submitted') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="text-6xl mb-6">✅</div>
                    <h2 className="text-2xl font-black text-white mb-3">제출 완료!</h2>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {wcWords.filter(w => w.trim()).map((w, i) => (
                            <span key={i} className="bg-blue-600/20 border border-blue-500/30 text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold">
                                {w}
                            </span>
                        ))}
                    </div>
                    <p className="text-slate-400 text-sm">관리자 화면에 단어가 표시됩니다.<br />잠시만 기다려주세요...</p>
                    <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mt-6"></div>
                </div>
            </div>
        );
    }

    // ── 행운권 추첨 대기 화면 ──
    if (playerState === 'lucky_draw_waiting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white bg-slate-900 p-6">
                <h2 className="text-2xl font-bold mt-2 mb-4 text-white">행운권 추첨</h2>
                
                <div style={{
                    transform: 'scale(0.8)',
                    transformOrigin: 'top center',
                    height: 420
                }}>
                    <LuckyDrawCanvas
                        participants={ldParticipants}
                        previousWinners={ldPreviousWinners}
                        drawState={ldDrawState}
                        winner={ldWinner}
                    />
                </div>

                <div className="bg-slate-800 border border-slate-700 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-slate-600 border-t-yellow-500 rounded-full animate-spin" />
                    <span className="text-slate-300 font-semibold text-[15px]">
                        {ldDrawState === 'mixing' ? '추첨 중입니다...' : 
                         ldDrawState === 'drawing' ? '결과를 확인하고 있습니다...' : 
                         '호스트가 추첨을 시작할 때까지 기다려주세요.'}
                    </span>
                </div>
            </div>
        );
    }

    // ── 행운권 추첨 결과 화면 ──
    if (playerState === 'lucky_draw_result' && luckyDrawResult) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white bg-slate-900 p-6">
                {luckyDrawResult.isWinner ? (
                    <div className="bg-yellow-400/20 border border-yellow-400 p-10 rounded-3xl flex flex-col items-center animate-bounce shadow-[0_0_40px_rgba(250,204,21,0.5)]">
                        <span className="text-7xl mb-4">🎉</span>
                        <h2 className="text-4xl font-black text-yellow-400 mb-2">당첨!</h2>
                        <p className="text-yellow-200 mt-2 font-semibold">축하합니다! 행운권에 당첨되셨습니다.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full max-w-sm">
                        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl flex flex-col items-center w-full shadow-lg">
                            <span className="text-5xl mb-4 grayscale opacity-50">😢</span>
                            <h2 className="text-3xl font-bold text-slate-300 mb-2">낙첨</h2>
                            <p className="text-slate-500 mb-6 text-[15px]">아쉽지만 다음 기회를 노려보세요.</p>

                            <div className="w-full bg-black/40 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                <span className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">이번 회차 당첨자</span>
                                <span className="text-white font-bold text-lg">{luckyDrawResult.winner}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── OX 대기 화면 (게임 시작 ~ 첫 문제 오기 전) ──
    if (playerState === 'ox_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="text-6xl mb-6">🎯</div>
                    <h2 className="text-3xl font-bold mb-3 text-white">OX 퀴즈</h2>
                    <p className="text-slate-400 font-medium text-base">첫 번째 문제를 기다리세요!</p>
                    <div className="mt-8 flex justify-center gap-4">
                        {['O', 'X'].map(opt => (
                            <div key={opt} className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black border-2 ${opt === 'O' ? 'text-blue-500 bg-blue-500/10 border-blue-500/30' : 'text-red-500 bg-red-500/10 border-red-500/30'}`}>
                                {opt}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── OX 게임오버 화면 ──
    if (playerState === 'ox_game_over' && oxGameOver) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="text-5xl mb-4">🏁</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">{nickname} 님의 결과</h2>
                    <div className="text-lg font-semibold bg-slate-700 text-slate-300 py-2 px-6 rounded-full inline-block mb-6">
                        총 {oxQuestion?.total || '?'}문제 중
                    </div>
                    <div className="text-6xl font-black text-blue-400 my-4">{oxGameOver.score}개 정답!</div>
                    {oxGameOver.rank && (
                        <div className="text-xl font-bold text-slate-300">{oxGameOver.rank}위 / {oxGameOver.total}명</div>
                    )}
                    <div className="text-sm text-slate-500 mt-6 font-medium">호스트가 최종 결과를 확인 중입니다.</div>
                </div>
            </div>
        );
    }

    // ── OX 결과 화면 ──
    if (playerState === 'ox_result' && oxResult) {
        const { isCorrect, correctAnswer, yourAnswer } = oxResult;
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-white text-center transition-colors ${isCorrect ? 'bg-emerald-700' : 'bg-red-800'}`}>
                <div className="text-8xl mb-6">{isCorrect ? '✅' : '❌'}</div>
                <div className="text-4xl font-black mb-3">{isCorrect ? '정답!' : '오답!'}</div>
                {!yourAnswer && <div className="text-lg text-white/70 font-medium mb-4">시간 초과 (미응답)</div>}
                <div className="flex gap-4 mt-6 justify-center">
                    {['O', 'X'].map(opt => (
                        <div key={opt} className={`relative w-24 h-24 rounded-2xl flex items-center justify-center text-5xl font-black border-4 ${opt === correctAnswer ? 'bg-white/20 border-white text-white' : 'bg-black/20 border-white/10 text-white/30'}`}>
                            {opt}
                        </div>
                    ))}
                </div>
                <div className="text-sm text-white/70 mt-8 font-medium">다음 문제를 기다리세요...</div>
            </div>
        );
    }

    // ── OX 문제 화면 ──
    if (playerState === 'ox_question' && oxQuestion) {
        const timerPercent = oxTimer / (oxQuestion.timeLimit || 5) * 100;
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100">
                {/* 상단 정보 바 */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4">
                    <div className="text-sm text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-lg">문제 {oxQuestion.questionIndex + 1} / {oxQuestion.total}</div>
                    <div className="text-sm text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-lg">{nickname}</div>
                </div>

                {/* 타이머 바 */}
                <div className="mx-6 h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                    <div style={{ width: `${timerPercent}%`, height: '100%', transition: 'width 0.9s linear, background 0.3s' }} className={oxTimer <= 2 ? 'bg-red-500' : 'bg-blue-500'} />
                </div>
                <div className={`text-center text-4xl font-black mt-4 mb-2 ${oxTimer <= 2 ? 'text-red-500' : 'text-blue-500'}`}>{oxTimer}</div>

                {/* 문제 */}
                <div className="flex-1 flex items-center justify-center px-6 py-4">
                    <div className="text-2xl sm:text-3xl font-bold text-white text-center leading-snug break-keep bg-slate-800/80 w-full rounded-3xl p-8 border border-slate-700 shadow-lg">
                        {oxQuestion.questionText}
                    </div>
                </div>

                {/* O / X 버튼 */}
                <div className="grid grid-cols-2 gap-4 px-6 pb-12 pt-4">
                    {['O', 'X'].map(opt => {
                        const isSelected = oxMyAnswer === opt;
                        const disabled = oxAnswered;
                        return (
                            <button
                                key={opt}
                                onClick={() => handleOxAnswer(opt)}
                                disabled={disabled}
                                className={`h-36 sm:h-48 rounded-3xl text-7xl sm:text-8xl font-black transition-all border-4 flex flex-col items-center justify-center ${disabled ? (isSelected ? (opt === 'O' ? 'bg-blue-600/20 border-blue-500 text-blue-500' : 'bg-red-600/20 border-red-500 text-red-500') : 'bg-slate-800 border-slate-700 text-slate-600') : (opt === 'O' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20 active:scale-95' : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 active:scale-95')} ${isSelected ? 'scale-95' : ''}`}
                                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
                {oxAnswered && (
                    <div className="text-center pb-8 text-blue-400 font-semibold text-sm">✔ 답변이 제출되었습니다</div>
                )}
            </div>
        );
    }

    // ── MC 대기 화면 ──
    if (playerState === 'mc_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="text-6xl mb-6">📝</div>
                    <h2 className="text-3xl font-bold mb-3 text-white">4지선다 퀴즈</h2>
                    <p className="text-slate-400 font-medium text-base">첫 번째 문제를 기다리세요!</p>
                </div>
            </div>
        );
    }

    // ── MC 게임오버 화면 ──
    if (playerState === 'mc_game_over' && mcGameOver) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full">
                    <div className="text-5xl mb-4">🏁</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">{nickname} 님의 결과</h2>
                    <div className="text-lg font-semibold bg-slate-700 text-slate-300 py-2 px-6 rounded-full inline-block mb-6">
                        총 {mcQuestion?.total || '?'}문제 중
                    </div>
                    <div className="text-6xl font-black text-blue-400 my-4">{mcGameOver.score}개 정답!</div>
                    {mcGameOver.rank && (
                        <div className="text-xl font-bold text-slate-300">{mcGameOver.rank}위 / {mcGameOver.total}명</div>
                    )}
                    <div className="text-sm text-slate-500 mt-6 font-medium">호스트가 최종 결과를 확인 중입니다.</div>
                </div>
            </div>
        );
    }

    // ── MC 결과 화면 ──
    if (playerState === 'mc_result' && mcResult) {
        const { isCorrect, correctAnswer, yourAnswer } = mcResult;
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-white text-center transition-colors ${isCorrect ? 'bg-emerald-700' : 'bg-red-800'}`}>
                <div className="text-8xl mb-6">{isCorrect ? '✅' : '❌'}</div>
                <div className="text-4xl font-black mb-3">{isCorrect ? '정답!' : '오답!'}</div>
                {!yourAnswer && <div className="text-lg text-white/70 font-medium mb-4">시간 초과 (미응답)</div>}

                <div className="bg-slate-900/40 p-6 rounded-2xl w-full max-w-sm mt-6 border border-white/10 shadow-xl">
                    <p className="text-sm text-white/60 mb-1">정답</p>
                    <div className="text-xl font-bold text-white mb-4 break-words">{correctAnswer}</div>

                    <p className="text-sm text-white/60 mb-1">나의 선택</p>
                    <div className={`text-xl font-bold break-words ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>{yourAnswer || '없음'}</div>
                </div>

                <div className="text-sm text-white/70 mt-8 font-medium">다음 문제를 기다리세요...</div>
            </div>
        );
    }

    // ── MC 문제 화면 ──
    if (playerState === 'mc_question' && mcQuestion) {
        const timerPercent = mcTimer / (mcQuestion.timeLimit || 20) * 100;

        return (
            <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100">
                {/* 상단 정보 바 */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4">
                    <div className="text-sm text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-lg">문제 {mcQuestion.questionIndex + 1} / {mcQuestion.total}</div>
                    <div className="text-sm text-slate-400 font-bold bg-slate-800 px-3 py-1 rounded-lg">{nickname}</div>
                </div>

                {/* 타이머 바 */}
                <div className="mx-6 h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                    <div style={{ width: `${timerPercent}%`, height: '100%', transition: 'width 0.9s linear, background 0.3s' }} className={mcTimer <= 5 ? 'bg-red-500' : 'bg-blue-500'} />
                </div>
                <div className={`text-center text-4xl font-black mt-4 mb-2 ${mcTimer <= 5 ? 'text-red-500' : 'text-blue-500'}`}>{mcTimer}</div>

                {/* 문제 */}
                <div className="flex-1 flex items-center justify-center px-6 py-4">
                    <div className="text-2xl sm:text-3xl font-bold text-white text-center leading-snug break-keep bg-slate-800/80 w-full rounded-3xl p-8 border border-slate-700 shadow-lg">
                        {mcQuestion.questionText}
                    </div>
                </div>

                {/* 4지선다 버튼 */}
                <div className="grid grid-cols-2 gap-3 px-6 pb-12 pt-4 flex-1 content-end max-w-2xl mx-auto w-full">
                    {mcQuestion.options?.map((opt, idx) => {
                        const isSelected = mcMyAnswer === opt.text;
                        const disabled = mcAnswered;
                        const colors = [
                            'bg-red-500 hover:bg-red-600 border-red-700 text-white',
                            'bg-blue-500 hover:bg-blue-600 border-blue-700 text-white',
                            'bg-amber-500 hover:bg-amber-600 border-amber-700 text-white',
                            'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white'
                        ];
                        const baseColor = colors[idx % 4];
                        const disabledUnselected = 'bg-slate-800 border-slate-700 text-slate-500 opacity-60';

                        // Option rendering
                        return (
                            <button
                                key={idx}
                                onClick={() => handleMcAnswer(opt.text)}
                                disabled={disabled}
                                className={`min-h-[120px] rounded-2xl text-lg sm:text-2xl font-bold transition-all border-b-[6px] flex flex-col items-center justify-center p-3 sm:p-4
                                    ${disabled
                                        ? (isSelected ? baseColor : disabledUnselected)
                                        : baseColor
                                    } ${isSelected ? 'scale-95 ring-4 ring-white/50 shadow-xl' : 'active:scale-95'}`}
                                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                            >
                                <span className="flex-1 text-center break-keep flex items-center justify-center w-full h-full drop-shadow-md">{opt.text}</span>
                            </button>
                        );
                    })}
                </div>
                {mcAnswered && (
                    <div className="text-center pb-8 text-blue-400 font-semibold text-sm animate-pulse">✔ 답변이 제출되었습니다</div>
                )}
            </div>
        );
    }

    // ── 두더지 대기 화면 (게임 시작 전) ──
    if (playerState === 'mole_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="text-7xl mb-6 animate-bounce">🐹</div>
                <h2 className="text-3xl font-bold mb-3 text-white">두더지 게임</h2>
                <div className="mt-8 py-8 px-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full relative overflow-hidden">
                    <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-lg font-medium text-slate-300">
                        호스트가 곧 게임을 시작합니다!<br />잠시만 기다려주세요...
                    </p>
                </div>
            </div>
        );
    }

    // ── 두더지 게임 카운트다운 ──
    if (playerState === 'mole_countdown') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 text-center">
                <h1 className="text-3xl font-black mb-8 text-white">두더지 게임</h1>
                <div className={`text-[10rem] font-black mb-8 transition-colors ${moleCountDown === 1 ? 'text-red-500' : moleCountDown === 2 ? 'text-yellow-500' : 'text-blue-500'}`}>
                    {moleCountDown}
                </div>
                <p className="text-xl text-slate-400 mt-8 font-bold">준비하세요!</p>
            </div>
        );
    }

    // ── 두더지 게임 ──
    if (playerState === 'mole_playing') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-slate-100 overflow-hidden relative select-none">
                <header className="flex justify-between items-center mb-6">
                    <div className="bg-slate-800 px-4 py-3 rounded-2xl text-lg font-bold flex gap-4 w-full justify-between items-center border border-slate-700 shadow-md">
                        <span className="text-blue-400 tracking-wider">점수: {moleScore}</span>
                        <span className="text-slate-300 bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-700 shadow-inner">
                            남은시간: <span className={moleTimer <= 5 ? 'text-red-500 animate-pulse font-black ml-1' : 'font-black ml-1'}>{moleTimer}초</span>
                        </span>
                    </div>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] aspect-square bg-slate-800 p-4 rounded-[2rem] border border-slate-700 shadow-2xl">
                        {Array.from({ length: 9 }).map((_, idx) => (
                            <div key={idx} className="relative w-full h-full bg-slate-900 rounded-full border border-slate-700 overflow-hidden shadow-inner flex items-end justify-center">
                                {/* Hole Back */}
                                <div className="absolute inset-0 bg-slate-950/50 rounded-full pointer-events-none"></div>

                                {/* Mole */}
                                {activeMoles.has(idx) && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleMoleHit(idx); }}
                                        onTouchStart={(e) => { e.preventDefault(); handleMoleHit(idx); }}
                                        className="absolute w-[80%] h-[80%] -bottom-1 bg-blue-500 rounded-t-[45%] border-t-[6px] border-blue-400 transition-transform active:scale-95 animate-bounce z-10 shadow-lg"
                                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <div className="flex justify-center gap-[10px] mt-4 opacity-80">
                                            <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
                                            <div className="w-2 h-2 bg-slate-900 rounded-full"></div>
                                        </div>
                                        <div className="w-5 h-3 bg-slate-900/50 rounded-full mx-auto mt-1"></div>
                                    </button>
                                )}

                                {/* Hole Front lip */}
                                <div className="absolute bottom-0 w-full h-1/3 bg-slate-800 rounded-b-full shadow-[0_-2px_6px_rgba(0,0,0,0.5)] z-20 pointer-events-none border-t border-slate-700/50"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── 버튼 배틀 대기 화면 (게임 시작 전) ──
    if (playerState === 'bb_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="text-7xl mb-6 animate-pulse">👆</div>
                <h2 className="text-3xl font-bold mb-3 text-white">버튼 배틀</h2>
                <div className="mt-8 py-8 px-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full relative overflow-hidden">
                    <div className="w-12 h-12 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-lg font-medium text-slate-300">
                        호스트가 곧 게임을 시작합니다!<br />잠시만 기다려주세요...
                    </p>
                </div>
            </div>
        );
    }

    // ── 버튼 배틀 카운트다운 ──
    if (playerState === 'bb_countdown') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 text-center">
                <h1 className="text-3xl font-black mb-8 text-white">버튼 배틀</h1>
                <div className={`text-[10rem] font-black mb-8 transition-colors ${bbCountDown === 1 ? 'text-red-500' : bbCountDown === 2 ? 'text-yellow-500' : 'text-cyan-400'}`}>
                    {bbCountDown}
                </div>
                <p className="text-xl text-slate-400 mt-8 font-bold">준비하세요!</p>
            </div>
        );
    }

    // ── 버튼 배틀 게임 ──
    if (playerState === 'bb_playing') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-slate-100 overflow-hidden relative select-none">
                <header className="flex justify-between items-center mb-6">
                    <div className="bg-slate-800 px-4 py-3 rounded-2xl text-lg font-bold flex gap-4 w-full justify-between items-center border border-slate-700 shadow-md">
                        <span className="text-cyan-400 tracking-wider">클릭: {bbScore}</span>
                        <span className="text-slate-300 bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-700 shadow-inner">
                            남은시간: <span className={bbTimer <= 5 ? 'text-red-500 animate-pulse font-black ml-1' : 'font-black ml-1'}>{bbTimer}초</span>
                        </span>
                    </div>
                </header>

                <div className="flex-1 flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-8 w-full px-4 content-center max-w-4xl mx-auto">
                    {Array.from({ length: bbSettings?.difficulty || 1 }).map((_, i) => {
                        const isTarget = i === bbNextTarget;
                        const difficulty = bbSettings?.difficulty || 1;
                        return (
                            <button
                                key={i}
                                onClick={() => handleBbClick(i)}
                                className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border-[8px] md:border-[12px] flex flex-col items-center justify-center flex-shrink-0 transition-all font-black text-2xl sm:text-3xl md:text-4xl text-cyan-400
                                    ${isTarget
                                        ? 'bg-slate-800 border-slate-700 shadow-[0_0_40px_rgba(0,212,255,0.4)] active:scale-95 animate-pulse ring-4 ring-cyan-400'
                                        : 'bg-slate-850 border-slate-700 opacity-50 scale-90'
                                    }`}
                                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                            >
                                <span className="text-4xl sm:text-5xl md:text-6xl mb-1">👆</span>
                                {difficulty > 1 ? `${i + 1} 번` : 'CLICK'}
                            </button>
                        );
                    })}
                </div>
                <div className="text-center pb-12">
                    <p className="text-slate-400 font-medium">테두리가 빛나는 버튼을 순서대로 빠르게 터치하세요!</p>
                </div>
            </div>
        );
    }

    // ── 스탑워치 대기 화면 ──
    if (playerState === 'stopwatch_waiting') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
                <div className="text-7xl mb-6 animate-pulse">⏱️</div>
                <h2 className="text-3xl font-bold mb-3 text-white">스탑워치</h2>
                <div className="mt-8 py-8 px-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full relative overflow-hidden">
                    <p className="text-lg font-medium text-slate-300">
                        목표 시간에 정확하게 멈추세요!<br />게임을 준비중입니다...
                    </p>
                </div>
            </div>
        );
    }

    // ── 스탑워치 게임 화면 ──
    if (playerState === 'stopwatch_playing') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-slate-100 overflow-hidden relative select-none">
                <header className="flex justify-between items-center mb-8">
                    <div className="bg-slate-800 px-4 py-2 rounded-xl font-mono text-sm border border-slate-700">PIN: {pinCode}</div>
                    <div className="flex items-center gap-2">
                        {team && (
                            <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/30">{team}팀</div>
                        )}
                        <div className="bg-slate-800 px-4 py-2 rounded-xl font-bold border border-slate-700">{nickname}</div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center mt-6">
                    <div className="bg-slate-800/80 px-8 py-4 rounded-3xl border border-slate-700 shadow-lg text-center mb-10 w-full max-w-sm">
                        <h1 className="text-xl text-slate-400 font-bold mb-1">목표 시간</h1>
                        <div className="text-4xl sm:text-5xl font-black text-blue-400 font-mono">
                            {stopwatchSettings?.targetTime ? Number(stopwatchSettings.targetTime).toFixed(2) : '10.00'}초
                        </div>
                    </div>

                    <div className="text-[5.5rem] sm:text-[7rem] font-mono font-black mb-16 tabular-nums" style={{ color: isStopwatchStopped ? '#fff' : '#60a5fa' }}>
                        {formatStopwatchTime(stopwatchRunningMs)}
                    </div>

                    <button
                        onClick={handleStopwatchStop}
                        disabled={isStopwatchStopped}
                        className={`w-48 h-48 sm:w-56 sm:h-56 rounded-[2.5rem] text-3xl font-black transition-all flex items-center justify-center ${isStopwatchStopped ? 'bg-slate-800 text-slate-500 border border-slate-700 scale-95' : 'bg-red-500 text-white shadow-xl shadow-red-500/20 active:scale-95'}`}
                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isStopwatchStopped ? '결과기록됨' : 'STOP'}
                    </button>
                    {isStopwatchStopped && (
                        <div className="text-blue-400 font-bold text-lg mt-8 drop-shadow-md">결과 전송 완료! 대기해주세요.</div>
                    )}
                </div>
            </div>
        );
    }

    // ── 순위 화면 (부저 및 결과 화면 공통) ──
    if (playerState === 'ranking') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center relative overflow-hidden">
                <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-xl max-w-sm w-full relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg shadow-blue-500/30">👑</div>
                    <h2 className="text-2xl font-bold mb-6 text-white">{nickname} 님의 최종 결과</h2>
                    {rank ? (
                        <>
                            <div className="text-7xl font-black text-blue-400 mb-2">{rank}등</div>
                            <div className="text-xl font-mono text-slate-300 bg-slate-900 py-3 px-6 rounded-2xl mt-6 border border-slate-700">
                                {useGameStore.getState().gameType === 'mole'
                                    ? `최종 점수: ${moleScore}점`
                                    : useGameStore.getState().gameType === 'button_battle'
                                        ? `클릭 수: ${bbScore}회`
                                        : useGameStore.getState().gameType === 'stopwatch'
                                            ? `기록: ${formatStopwatchTime(elapsedMs)}`
                                            : `기록: ${formatTime(elapsedMs)}`}
                            </div>
                        </>
                    ) : (
                        <div className="text-3xl font-bold text-red-500 mt-4 mb-4">탈락 (미참여)</div>
                    )}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -z-0"></div>
            </div>
        );
    }

    // ── 부저 게임 화면 ──
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col p-6 text-slate-100 overflow-hidden relative">
            <header className="flex justify-between items-center mb-10">
                <div className="bg-slate-800 px-4 py-2 rounded-xl font-mono text-sm border border-slate-700">PIN: {pinCode}</div>
                <div className="flex items-center gap-2">
                    {team && (
                        <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/30">{team}팀</div>
                    )}
                    <div className="bg-slate-800 px-4 py-2 rounded-xl font-bold border border-slate-700">{nickname}</div>
                </div>
            </header>

            <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-12">
                <h1 className="text-3xl font-black text-white tracking-tight">스피드 부저</h1>
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex-shrink-0">
                    <button
                        onClick={handleBuzzerClick}
                        disabled={isBuzzed}
                        className={`absolute inset-0 w-full h-full rounded-full transition-all duration-150 flex flex-col items-center justify-center ${isBuzzed ? 'bg-slate-800 border-8 border-slate-700 text-slate-500 scale-95 shadow-inner' : 'bg-red-500 hover:bg-red-400 border-8 border-red-600 text-white shadow-[0_15px_40px_rgba(239,68,68,0.4)] active:scale-95'}`}
                        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isBuzzed ? (
                            <>
                                <span className="text-5xl font-black mb-2">{rank}등</span>
                                <span className="text-lg font-mono font-medium opacity-80">{formatTime(elapsedMs)}</span>
                            </>
                        ) : (
                            <span className="text-4xl sm:text-5xl font-black tracking-wider">누르세요!</span>
                        )}
                    </button>
                    {!isBuzzed && (
                        <div className="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping -z-10 pointer-events-none"></div>
                    )}
                </div>
                {isBuzzed && (
                    <div className="text-blue-400 font-bold text-lg animate-bounce mt-4">결과가 전송되었습니다!</div>
                )}
            </div>
            {/* Subtle background decoration */}
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        </div>
    );
}
