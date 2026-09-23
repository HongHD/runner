import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { Plus, Trash2 } from 'lucide-react';

export default function GameEditor() {
    const { id } = useParams(); // 'create' or game ID
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useAuthStore();

    const isCreateTemp = location.pathname.includes('/create');

    const [gameData, setGameData] = useState({
        title: '', description: '', game_type: 'quiz', questions: [], settings: null
    });
    const [loading, setLoading] = useState(!isCreateTemp);

    const apiHeaders = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!isCreateTemp) {
            axios.get(`/api/games/${id}`, { headers: apiHeaders })
                .then(res => {
                    const data = res.data;
                    data.questions = data.Questions || data.questions || [];
                    // Ensure options exist for ox questions
                    if (data.game_type === 'ox') {
                        data.questions = data.questions.map(q => {
                            let opts = q.Options || [];
                            if (opts.length !== 2) {
                                opts = [
                                    { option_text: 'O', is_correct: true },
                                    { option_text: 'X', is_correct: false }
                                ];
                            }
                            return { ...q, Options: opts };
                        });
                    } else if (data.game_type === 'multiple_choice') {
                        data.questions = data.questions.map(q => {
                            let opts = q.Options || [];
                            if (opts.length !== 4) {
                                opts = [
                                    { option_text: '보기 1', is_correct: true },
                                    { option_text: '보기 2', is_correct: false },
                                    { option_text: '보기 3', is_correct: false },
                                    { option_text: '보기 4', is_correct: false }
                                ];
                            }
                            return { ...q, Options: opts };
                        });
                    }
                    if (data.game_type === 'mole' && !data.settings) {
                        data.settings = { level: 1, difficulty: 'normal', duration: 30 };
                    } else if (data.game_type === 'stopwatch' && !data.settings) {
                        data.settings = { targetTime: 10 };
                    } else if (data.settings && typeof data.settings === 'string') {
                        try { data.settings = JSON.parse(data.settings); } catch (e) { }
                    }
                    setGameData(data);
                })
                .catch(err => {
                    alert('게임을 불러올 수 없습니다.');
                    navigate('/admin/dashboard');
                })
                .finally(() => setLoading(false));
        } else {
            // Check if game_type is passed in query
            const queryParams = new URLSearchParams(location.search);
            const type = queryParams.get('game_type') || 'quiz';
            let defaultSettings = null;
            if (type === 'mole') defaultSettings = { level: 1, difficulty: 'normal', duration: 30 };
            if (type === 'stopwatch') defaultSettings = { targetTime: 10 };
            setGameData(prev => ({ ...prev, game_type: type, settings: defaultSettings }));
            setLoading(false);
        }
    }, [id, isCreateTemp, location.search]);

    const handleSave = async () => {
        try {
            if (isCreateTemp) {
                const res = await axios.post('/api/games', gameData, { headers: apiHeaders });
                alert('게임이 생성되었습니다.');
                navigate(`/admin/game/${res.data.id}/edit`);
            } else {
                await axios.put(`/api/games/${id}`, gameData, { headers: apiHeaders });
                alert('저장되었습니다.');
            }
        } catch (err) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const addQuestion = () => {
        if (gameData.game_type === 'ox') {
            setGameData({
                ...gameData,
                questions: [
                    ...gameData.questions,
                    {
                        question_text: '',
                        time_limit: 30,
                        Options: [
                            { option_text: 'O', is_correct: true },
                            { option_text: 'X', is_correct: false }
                        ]
                    }
                ]
            });
        } else if (gameData.game_type === 'multiple_choice') {
            setGameData({
                ...gameData,
                questions: [
                    ...gameData.questions,
                    {
                        question_text: '',
                        time_limit: 30,
                        Options: [
                            { option_text: '보기 1', is_correct: true },
                            { option_text: '보기 2', is_correct: false },
                            { option_text: '보기 3', is_correct: false },
                            { option_text: '보기 4', is_correct: false }
                        ]
                    }
                ]
            });
        }
    };

    const updateQuestionText = (index, text) => {
        const newQ = [...gameData.questions];
        newQ[index].question_text = text;
        setGameData({ ...gameData, questions: newQ });
    };

    const removeQuestion = (index) => {
        const newQ = [...gameData.questions];
        newQ.splice(index, 1);
        setGameData({ ...gameData, questions: newQ });
    };

    const setOXAnswer = (qIndex, isO) => {
        const newQ = [...gameData.questions];
        newQ[qIndex].Options = [
            { option_text: 'O', is_correct: isO },
            { option_text: 'X', is_correct: !isO }
        ];
        setGameData({ ...gameData, questions: newQ });
    };

    const updateMCOptionText = (qIndex, oIndex, text) => {
        const newQ = [...gameData.questions];
        newQ[qIndex].Options[oIndex].option_text = text;
        setGameData({ ...gameData, questions: newQ });
    };

    const setMCOptionCorrect = (qIndex, oIndex) => {
        const newQ = [...gameData.questions];
        newQ[qIndex].Options.forEach((opt, idx) => {
            opt.is_correct = (idx === oIndex);
        });
        setGameData({ ...gameData, questions: newQ });
    };

    if (loading) return <div className="p-10 text-center text-slate-500 flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 transition-colors">
            <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {isCreateTemp ? '새 게임 생성' : `${gameData.game_type.toUpperCase()} 편집`}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium hidden sm:block mt-0.5">최적화된 뷰 지원</p>
                    </div>
                </div>
                <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    저장
                </button>
            </nav>

            <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">게임 제목</label>
                            <input
                                type="text"
                                value={gameData.title}
                                onChange={e => setGameData({ ...gameData, title: e.target.value })}
                                className="w-full text-lg font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner placeholder:text-slate-400 font-medium"
                                placeholder="예: 2026 트렌드 모의고사"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">설명 (선택)</label>
                            <textarea
                                value={gameData.description}
                                onChange={e => setGameData({ ...gameData, description: e.target.value })}
                                className="w-full text-base font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner placeholder:text-slate-400"
                                placeholder="게임에 대한 간단한 설명을 적어주세요."
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Question Editor */}
                    {!isCreateTemp && gameData.game_type === 'ox' && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center text-sm">✓</span>
                                    OX 문제 관리
                                </h2>
                                <button onClick={addQuestion} className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                                    <Plus size={18} strokeWidth={2.5} /> 새 문제 추가
                                </button>
                            </div>

                            {gameData.questions.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center text-slate-500 font-medium">
                                    <div className="text-4xl mb-3">📝</div>
                                    아직 추가된 문제가 없습니다. <br className="hidden sm:block" /> 우측 상단의 <b className="text-blue-500 dark:text-blue-400">새 문제 추가</b> 버튼을 눌러 OX 문제를 만들어보세요!
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {gameData.questions.map((q, idx) => {
                                        const isO = q.Options && q.Options[0] ? q.Options[0].is_correct : true;
                                        return (
                                            <div key={idx} className="p-5 sm:p-6 border border-slate-200 dark:border-slate-700 rounded-3xl relative hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-slate-800 shadow-sm group mt-4">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                                    <div className="flex-1 w-full">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg">Q.{idx + 1}</span>
                                                        </div>
                                                        <textarea
                                                            value={q.question_text}
                                                            onChange={e => updateQuestionText(idx, e.target.value)}
                                                            className="w-full text-lg font-semibold px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                                            placeholder="질문을 입력하세요..."
                                                            rows="2"
                                                        />
                                                    </div>
                                                    <div className="w-full sm:w-auto flex flex-col items-center">
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">정답 선택</label>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => setOXAnswer(idx, true)}
                                                                className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl border-2 font-black text-2xl transition-all ${isO ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 scale-100 shadow-md shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-60 hover:opacity-100 scale-95'}`}
                                                            >
                                                                O
                                                            </button>
                                                            <button
                                                                onClick={() => setOXAnswer(idx, false)}
                                                                className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl border-2 font-black text-2xl transition-all ${!isO ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 scale-100 shadow-md shadow-red-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-60 hover:opacity-100 scale-95'}`}
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-full text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:border-red-800 transition-all shadow-md z-10 block sm:hidden group-hover:flex">
                                                    <Trash2 size={14} strokeWidth={3} />
                                                </button>
                                                {/* Mobile visible trash */}
                                                <button onClick={() => removeQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 flex sm:hidden items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-full text-red-500 hover:bg-red-50 hover:border-red-200 shadow-md z-10">
                                                    <Trash2 size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multiple Choice Editor */}
                    {!isCreateTemp && gameData.game_type === 'multiple_choice' && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center text-sm font-black">4</span>
                                    4지선다 문제 관리
                                </h2>
                                <button onClick={addQuestion} className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                                    <Plus size={18} strokeWidth={2.5} /> 새 문제 추가
                                </button>
                            </div>

                            {gameData.questions.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center text-slate-500 font-medium">
                                    <div className="text-4xl mb-3">📝</div>
                                    아직 추가된 문제가 없습니다. <br className="hidden sm:block" /> 우측 상단의 <b className="text-blue-500 dark:text-blue-400">새 문제 추가</b> 버튼을 눌러 문제를 만들어보세요!
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {gameData.questions.map((q, idx) => (
                                        <div key={idx} className="p-5 sm:p-6 border border-slate-200 dark:border-slate-700 rounded-3xl relative hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-slate-800 shadow-sm group mt-4">
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg">Q.{idx + 1}</span>
                                                </div>
                                                <textarea
                                                    value={q.question_text}
                                                    onChange={e => updateQuestionText(idx, e.target.value)}
                                                    className="w-full text-lg font-semibold px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                                    placeholder="질문을 입력하세요..."
                                                    rows="2"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">보기 작성 및 정답 선택</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.Options?.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all cursor-pointer ${opt.is_correct ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`} onClick={() => setMCOptionCorrect(idx, oIdx)}>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${opt.is_correct ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                                                                {opt.is_correct && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={opt.option_text}
                                                                onChange={e => updateMCOptionText(idx, oIdx, e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                className="w-full bg-transparent outline-none font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 px-2"
                                                                placeholder={`보기 ${oIdx + 1}`}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={() => removeQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-full text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/30 dark:hover:border-red-800 transition-all shadow-md z-10 block sm:hidden group-hover:flex">
                                                <Trash2 size={14} strokeWidth={3} />
                                            </button>
                                            <button onClick={() => removeQuestion(idx)} className="absolute -top-3 -right-3 w-8 h-8 flex sm:hidden items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-full text-red-500 hover:bg-red-50 hover:border-red-200 shadow-md z-10">
                                                <Trash2 size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mole Editor */}
                    {!isCreateTemp && gameData.game_type === 'mole' && gameData.settings && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                                <span className="text-2xl">🐹</span>
                                두더지 게임 룰셋
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">시작 레벨 (1~10)</label>
                                    <input
                                        type="number" min="1" max="10"
                                        value={gameData.settings.level || 1}
                                        onChange={e => setGameData(prev => ({ ...prev, settings: { ...prev.settings, level: parseInt(e.target.value) || 1 } }))}
                                        className="w-full text-lg font-bold px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                    />
                                    <p className="text-xs text-slate-500 mt-1 ml-1 font-medium">레벨이 높을수록 구멍과 속도가 증가합니다.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">게임 진행 시간 (초)</label>
                                    <input
                                        type="number" min="10" max="120"
                                        value={gameData.settings.duration || 30}
                                        onChange={e => setGameData(prev => ({ ...prev, settings: { ...prev.settings, duration: parseInt(e.target.value) || 30 } }))}
                                        className="w-full text-lg font-bold px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">난이도 설정</label>
                                    <select
                                        value={gameData.settings.difficulty || 'normal'}
                                        onChange={e => setGameData(prev => ({ ...prev, settings: { ...prev.settings, difficulty: e.target.value } }))}
                                        className="w-full text-base font-bold px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner appearance-none custom-select-arrow"
                                    >
                                        <option value="easy">🟩 쉬움 (여유롭게)</option>
                                        <option value="normal">🟨 보통</option>
                                        <option value="hard">🟥 어려움 (아주 빠름)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stopwatch Editor */}
                    {!isCreateTemp && gameData.game_type === 'stopwatch' && gameData.settings && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                                <span className="text-2xl">⏱️</span>
                                스탑워치 게임 설정
                            </h2>
                            <div className="bg-slate-50 dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">목표 시간 (초)</label>
                                <div className="relative max-w-sm">
                                    <input
                                        type="number" min="1" max="60" step="0.01"
                                        value={gameData.settings.targetTime || 10}
                                        onChange={e => setGameData(prev => ({ ...prev, settings: { ...prev.settings, targetTime: parseFloat(e.target.value) || 10 } }))}
                                        className="w-full text-2xl font-black font-mono border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">SECONDS</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 ml-1 font-medium bg-slate-200 dark:bg-slate-800 inline-block px-3 py-1 rounded-lg">소수점 둘째 자리(밀리초)까지 설정 가능합니다 (예: 10.00)</p>
                            </div>
                        </div>
                    )}

                    {!isCreateTemp && !['ox', 'mole', 'stopwatch', 'multiple_choice'].includes(gameData.game_type) && (
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center text-slate-500 font-bold flex flex-col items-center">
                                <span className="text-4xl mb-3">🛠️</span>
                                이 게임 타입에 대한 상세 편집은 아직 지원되지 않습니다.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom CSS for select arrow to make it look clean without full tailwind plugin */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-select-arrow {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 7l5 5 5-5'/%3e%3c/svg%3e");
                    background-position: right 1rem center;
                    background-repeat: no-repeat;
                    background-size: 1.5em 1.5em;
                    padding-right: 2.5rem;
                }
                .dark .custom-select-arrow {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 7l5 5 5-5'/%3e%3c/svg%3e");
                }
            `}} />
        </div>
    );
}
