import React from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';

export default function PlayerResult() {
    const { score, nickname, resetGame } = useGameStore();
    const navigate = useNavigate();

    const handleFinish = () => {
        resetGame();
        navigate('/play');
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-white text-center">
            <div className="w-full max-w-sm space-y-8 animate-fade-in-up">

                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 blur-[100px] opacity-30 rounded-full"></div>
                    <h1 className="text-6xl font-black text-yellow-500 tracking-tight drop-shadow-xl relative z-10">
                        끝!
                    </h1>
                </div>

                <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-4">
                    <p className="text-xl text-slate-300 font-medium">수고하셨습니다 👏</p>
                    <h2 className="text-3xl font-bold text-white">{nickname}</h2>

                    <div className="py-6 border-y border-slate-700/50 my-6">
                        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">최종 점수</p>
                        <div className="text-5xl font-black text-blue-400">
                            {score} <span className="text-2xl text-slate-500 font-medium">점</span>
                        </div>
                    </div>

                    <button
                        onClick={handleFinish}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                    >
                        처음으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}
