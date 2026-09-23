import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

export default function PlayerLobby() {
    const { nickname, pinCode, socket, setSocket, resetGame, team, setTeam, participantId, setGameType, setSpeedPianoLevel } = useGameStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) {
            // window._playerSocket 전역으로 이중 소켓 방지 (useRef 방식은 React Strict Mode 이중 마운트 시 초기화됨)
            if (window._playerSocket && (window._playerSocket.connected || window._playerSocket.connecting)) {
                setSocket(window._playerSocket);
                return;
            }
            if (pinCode && nickname) {
                console.log('[Lobby] 새로고침 감지. 소켓 재연결 시도...');
                const newSocket = io();
                window._playerSocket = newSocket; // 전역 등록
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
                    useGameStore.getState().setGameType(data.gameType || null);
                    if (data.sessionStatus === 'active') {
                        if (data.gameTitle === '실시간 설문' || data.gameType === 'survey') {
                            navigate('/play/survey');
                        } else if (data.gameTitle === '게시판' || data.gameType === 'board') {
                            navigate('/play/board');
                        } else if (data.gameType === 'word_cloud' || data.gameTitle === '워드클라우드') {
                            // 게임이 이미 진행중이면 단어 입력 화면으로
                            navigate('/play/game', { state: { fromLobby: true, type: 'word_cloud' } });
                        } else {
                            navigate('/play/game');
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
                navigate('/play'); // 정보 없으면 처음으로
                return;
            }
        }

        const onGameStarted = (data) => {
            const gameTitle = data.gameTitle || useGameStore.getState().gameTitle;
            const gameType = data.gameType || null;
            // gameType을 스토어에 저장해서 PlayGame.jsx가 마운트될 때 읽을 수 있도록
            useGameStore.getState().setGameType(gameType);
            if (data.settings) {
                useGameStore.getState().setGameSettings(data.settings);
            }
            if (gameTitle === '실시간 설문') {
                navigate('/play/survey', { state: { fromLobby: true, settings: data.settings } });
            } else if (gameTitle === '게시판') {
                navigate('/play/board', { state: { fromLobby: true, settings: data.settings } });
            } else if (gameTitle === '스피드 피아노') {
                navigate('/play/speed-piano', { state: { fromLobby: true, settings: data.settings, type: gameType } });
            } else if (gameTitle === '스피드 타일') {
                navigate('/play/speed-tile', { state: { fromLobby: true, settings: data.settings, type: gameType } });
            } else if (gameType === 'empathy_vote' || gameTitle === '공감투표') {
                navigate('/play/empathy-vote', { state: { fromLobby: true, settings: data.settings, type: gameType } });
            } else if (gameType === 'word_cloud' || gameTitle === '워드클라우드') {
                navigate('/play/game', { state: { fromLobby: true, settings: data.settings, type: gameType } });
            } else {
                navigate('/play/game', { state: { fromLobby: true, settings: data.settings, type: gameType } });
            }
        };

        // 강제 로그아웃 처리
        const onForceLogout = () => {
            console.log('[Lobby] 강제 로그아웃 수신');
            socket.disconnect();
            resetGame();
            navigate('/play');
        };

        const onAdminLeft = () => {
            console.log('[Lobby] 호스트가 잠시 자리를 비웠거나 다른 게임을 준비 중입니다.');
        };

        socket.on('game_started', onGameStarted);
        socket.on('force_logout_user', onForceLogout);
        socket.on('admin_left', onAdminLeft);

        // Speed Piano 레벨 데이터 받기
        socket.on('speed_piano_level', (data) => {
            console.log('🎹 [Lobby] Speed Piano 레벨 데이터 수신:', data);
            const { level, notes } = data;
            setSpeedPianoLevel(level, notes);
        });

        socket.on('teams_updated', (data) => {
            if (data.assignments) {
                const myAssignment = data.assignments.find(a => a.participantId === participantId);
                if (myAssignment) {
                    setTeam(myAssignment.team);
                }
            }
        });

        return () => {
            socket.off('game_started', onGameStarted);
            socket.off('force_logout_user', onForceLogout);
            socket.off('admin_left', onAdminLeft);
            socket.off('speed_piano_level');
            socket.off('teams_updated');
        };
    }, [socket, navigate, resetGame, participantId, setTeam]);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 text-center relative overflow-hidden">
            <div className="space-y-8 max-w-md w-full animate-fade-in-up z-10">

                {/* Header Section */}
                <div className="flex justify-between items-center bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-lg">
                    <div className="bg-slate-900 px-4 py-2 rounded-xl font-mono text-lg font-bold text-blue-400 border border-slate-700">
                        PIN: {pinCode}
                    </div>
                    {team && (
                        <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 py-2 px-4 rounded-xl text-sm font-bold tracking-wider">
                            {team}팀
                        </div>
                    )}
                </div>

                {/* Welcome Message */}
                <div className="py-6">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
                        환영합니다!
                    </h2>
                    <div className="text-4xl font-black text-blue-400 mt-2 block break-keep">
                        {nickname}
                    </div>
                </div>

                {/* Waiting State Card */}
                <div className="py-10 px-6 bg-slate-800 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
                    <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-8"></div>
                    <p className="text-lg font-medium text-slate-300">
                        호스트가 게임을 시작할 때까지 <br className="hidden sm:block" /> 기다려주세요...
                    </p>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                </div>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute top-1/4 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
        </div>
    );
}
