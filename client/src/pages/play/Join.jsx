import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useGameStore from '../../store/gameStore';

export default function PlayerJoin() {
    const [pinCodeInput, setPinCodeInput] = useState('');
    const [nicknameInput, setNicknameInput] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setSocket, setRoomInfo, setGameState } = useGameStore();

    const handleJoin = (e) => {
        e.preventDefault();
        if (pinCodeInput.length !== 6) {
            return setError('PIN 6자리를 올바르게 입력해주세요.');
        }
        if (!nicknameInput.trim()) {
            return setError('닉네임을 입력해주세요.');
        }

        // 통신 소켓 연결 시작
        // 기존 소켓 정리 후 새 연결 (로그아웃 후 재접속 케이스)
        if (window._playerSocket) {
            window._playerSocket.disconnect();
            window._playerSocket = null;
        }
        const newSocket = io();
        window._playerSocket = newSocket; // 전역 등록으로 이중 소켓 방지
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('player_join', { pinCode: pinCodeInput, nickname: nicknameInput });
        });

        newSocket.on('join_success', (data) => {
            setRoomInfo(pinCodeInput, nicknameInput);
            useGameStore.getState().setSessionInfo(data.participantId, data.sessionId);
            useGameStore.getState().setTeam(data.team);
            setGameState('waiting');
            navigate('/play/lobby');
        });

        newSocket.on('join_error', (data) => {
            setError(data?.message || '입장에 실패했습니다.');
            newSocket.disconnect();
            window._playerSocket = null;
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket 연결 실패:', error);
            setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
            newSocket.disconnect();
        });

        newSocket.on('disconnect', () => {
            console.log('Socket 연결 해제됨');
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 overflow-hidden relative">
            <div className="w-full max-w-md z-10 space-y-10">
                {/* Logo Area */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
                        <span className="text-4xl font-black text-white">RVD</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">참여자 입장</h1>
                    <p className="text-slate-400 font-medium">관리자의 안내에 따라 PIN과 닉네임을 입력하세요</p>
                </div>

                {/* Form Area */}
                <form onSubmit={handleJoin} className="bg-slate-800 p-8 rounded-3xl shadow-xl shadow-black/50 border border-slate-700 space-y-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center font-semibold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">게임 PIN</label>
                            <input
                                type="text"
                                maxLength={6}
                                value={pinCodeInput}
                                onChange={e => setPinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-slate-900/50 text-white text-center text-3xl font-bold py-5 rounded-2xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-1 ring-blue-500 transition-all placeholder:text-slate-600 tracking-[0.2em]"
                                placeholder="000000"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300 ml-1">닉네임</label>
                            <input
                                type="text"
                                maxLength={12}
                                value={nicknameInput}
                                onChange={e => setNicknameInput(e.target.value)}
                                className="w-full bg-slate-900/50 text-white text-center text-xl font-bold py-4 rounded-2xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-1 ring-blue-500 transition-all placeholder:text-slate-600"
                                placeholder="닉네임 입력"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-lg font-bold py-5 rounded-2xl shadow-lg transition-colors"
                    >
                        입장하기
                    </button>
                </form>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none"></div>
        </div>
    );
}
