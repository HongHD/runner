import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { ChevronLeft } from 'lucide-react';

export default function PlaySpeedPiano() {
    const { socket, pinCode, nickname, participantId, speedPianoLevel, speedPianoNotes, clearSpeedPianoData } = useGameStore();
    const navigate = useNavigate();

    const [gameStarted, setGameStarted] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentNotes, setCurrentNotes] = useState([]);
    const [nextNoteIndex, setNextNoteIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);
    const [showRanking, setShowRanking] = useState(false);
    const [rankingData, setRankingData] = useState([]);
    const gameStartTimeRef = useRef(Date.now());
    const levelStartTimeRef = useRef(Date.now());

    const MAX_LEVELS = 10;

    // 음 정보
    const NOTE_INFO = {
        'C': { korName: '도', keyIdx: 0, color: '#3B82F6' }, // 낮은 도 - 파란색
        'D': { korName: '레', keyIdx: 1, color: '#7C3AED' }, // 보라색
        'E': { korName: '미', keyIdx: 2, color: '#EC4899' }, // 핑크색
        'F': { korName: '파', keyIdx: 3, color: '#F59E0B' }, // 주황색
        'G': { korName: '솔', keyIdx: 4, color: '#10B981' }, // 초록색
        'A': { korName: '라', keyIdx: 5, color: '#0EA5E9' }, // 하늘색
        'B': { korName: '시', keyIdx: 6, color: '#6366F1' }, // 인디고색
        'C_HIGH': { korName: '도', keyIdx: 7, color: '#EF4444' } // 높은 도 - 빨간색
    };

    const PIANO_KEYS = [
        { name: 'C', label: '도', noteKey: 'C' },
        { name: 'D', label: '레', noteKey: 'D' },
        { name: 'E', label: '미', noteKey: 'E' },
        { name: 'F', label: '파', noteKey: 'F' },
        { name: 'G', label: '솔', noteKey: 'G' },
        { name: 'A', label: '라', noteKey: 'A' },
        { name: 'B', label: '시', noteKey: 'B' },
        { name: 'C_HIGH', label: '도', noteKey: 'C_HIGH' }
    ];

    useEffect(() => {
        if (!socket) return;

        console.log('🎬 PlaySpeedPiano 마운트됨 - 소켓 리스너 등록');

        const handleGameStarted = (data) => {
            console.log('🎮 게임 시작 이벤트 수신:', data);
            setGameStarted(true);
            gameStartTimeRef.current = Date.now();
            // 게임 시작 시 초기 상태 리셋
            setCurrentLevel(0);
            setCurrentNotes([]);
            setNextNoteIndex(0);
            setScore(0);
            setCorrectCount(0);
            setTotalAttempts(0);
            setGameEnded(false);
        };

        const handleSpeedPianoLevel = (data) => {
            // data: { level, notes }
            console.log('🎹 레벨 데이터 수신:', data);
            const { level, notes } = data;

            // gameStarted가 false면 먼저 게임을 시작 상태로 설정
            if (!gameStarted) {
                console.log('🎹 게임이 아직 시작되지 않음 - 게임 시작 상태로 설정');
                setGameStarted(true);
                gameStartTimeRef.current = Date.now();
            }

            setCurrentLevel(level);
            setCurrentNotes(notes);
            setNextNoteIndex(0);
            levelStartTimeRef.current = Date.now();
        };

        const handleGameEnded = () => {
            console.log('🏁 게임 종료 이벤트 수신');
            setGameEnded(true);
        };

        const handleAdminLeft = () => {
            console.log('🚪 어드민 연결 종료 (대기방 이동)');
            navigate('/play/lobby');
        };

        const handlePlayerRankingData = (data) => {
            console.log('🏆 랭킹 데이터 수신:', data);
            setRankingData(data.ranking);
            setShowRanking(true);
        };

        socket.on('game_started', handleGameStarted);
        socket.on('speed_piano_level', handleSpeedPianoLevel);
        socket.on('game_ended', handleGameEnded);
        socket.on('player_ranking_data', handlePlayerRankingData);
        socket.on('admin_left', handleAdminLeft);
        socket.on('force_logout', () => {
            console.log('로그아웃 신호 받음');
            navigate('/play');
        });

        return () => {
            socket.off('game_started', handleGameStarted);
            socket.off('speed_piano_level', handleSpeedPianoLevel);
            socket.off('game_ended', handleGameEnded);
            socket.off('player_ranking_data', handlePlayerRankingData);
            socket.off('admin_left', handleAdminLeft);
            socket.off('force_logout');
        };
    }, [socket, navigate]);

    // Speed Piano 데이터가 게임 스토어에 저장되었으면 로드
    useEffect(() => {
        if (speedPianoLevel && speedPianoNotes && speedPianoNotes.length > 0) {
            console.log('🎹 [PlaySpeedPiano] 저장된 레벨 데이터 로드:', speedPianoLevel, speedPianoNotes);
            if (!gameStarted) {
                // 게임이 아직 시작되지 않았으면 먼저 시작 상태로 설정
                console.log('🎮 [PlaySpeedPiano] 게임 시작 상태 설정');
                setGameStarted(true);
                gameStartTimeRef.current = Date.now();
            }
            setCurrentLevel(speedPianoLevel);
            setCurrentNotes(speedPianoNotes);
            setNextNoteIndex(0);
            levelStartTimeRef.current = Date.now();
            // 로드한 후 스토어에서 제거
            clearSpeedPianoData();
        }
    }, [speedPianoLevel, speedPianoNotes, gameStarted, clearSpeedPianoData]);

    // 정확도 기반 기본 점수 계산
    const calculateScore = (isCorrect, elapsedTime) => {
        if (!isCorrect) return 0;

        // 정확도: 100점 만점
        let accuracyScore = 100;

        // 속도 보너스: 빠를수록 추가 점수 (최대 50점)
        let speedBonus = Math.max(0, 50 - (elapsedTime / 100));

        return Math.round(accuracyScore + speedBonus);
    };

    const handlePianoKeyClick = (key) => {
        if (!gameStarted || gameEnded || currentNotes.length === 0) return;

        const totalTime = Date.now() - gameStartTimeRef.current;
        const elapsedMs = Date.now() - levelStartTimeRef.current;

        const nextNote = currentNotes[nextNoteIndex];
        if (!nextNote) return;

        setTotalAttempts(prev => prev + 1);

        const isCorrect = nextNote === key;

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);

            const scoreGained = calculateScore(true, elapsedMs);
            setScore(prev => prev + scoreGained);

            // 속도 계산 (초당 정확한 클릭 수)
            const newSpeed = ((correctCount + 1) / totalTime) * 1000;
            setSpeed(newSpeed);

            setNextNoteIndex(prev => prev + 1);

            // 소켓으로 서버에 업데이트 전송
            socket.emit('player_speed_piano_note', {
                pinCode,
                level: currentLevel,
                noteIndex: nextNoteIndex,
                isCorrect: true,
                elapsedMs,
                totalTime
            });

            // 모든 음을 맞혔으면 다음 레벨 대기
            if (nextNoteIndex + 1 >= currentNotes.length) {
                // 다음 레벨까지 대기
            }
        } else {
            // 틀린 경우 점수 감소
            setScore(prev => Math.max(0, prev - 10));

            socket.emit('player_speed_piano_note', {
                pinCode,
                level: currentLevel,
                noteIndex: nextNoteIndex,
                isCorrect: false,
                elapsedMs,
                totalTime
            });
        }
    };

    if (showRanking && rankingData) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 500, padding: 24 }}>
                    <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#fcd34d' }}>🏆 최종 게임 결과</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                        {rankingData.map((p, i) => {
                            const isMe = p.id === participantId;
                            return (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', padding: '16px 20px',
                                    background: isMe ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: 12, border: isMe ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ fontSize: 20, width: 40, fontWeight: 800, textAlign: 'center' }}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                    </div>
                                    <div style={{ flex: 1, fontWeight: isMe ? 800 : 500, fontSize: 16 }}>{p.name}</div>
                                    <div style={{ fontWeight: 800, color: '#4ade80', fontSize: 16 }}>{p.score}점</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (gameEnded) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>🎹 게임 종료</h1>
                    <p style={{ fontSize: 18, marginBottom: 32 }}>최종 점수: <span style={{ color: '#4ade80', fontWeight: 800 }}>{score}점</span></p>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
                        <p>정확도: {totalAttempts > 0 ? Math.round(correctCount / totalAttempts * 100) : 0}%</p>
                        <p>속도: {speed.toFixed(2)}/초</p>
                    </div>
                    <button
                        onClick={() => navigate('/play/lobby')}
                        style={{ background: '#3B82F6', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                    >
                        로비로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (!gameStarted) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>🎹 스피드 피아노</h1>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>게임 시작을 기다리는 중...</p>
                </div>
            </div>
        );
    }

    const nextNoteToPlay = currentNotes[nextNoteIndex];
    const progress = currentNotes.length > 0 ? Math.round((nextNoteIndex / currentNotes.length) * 100) : 0;

    return (
        <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        🎹 스피드 피아노
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.8)', marginTop: 3 }}>
                        {nickname} · 점수: <span style={{ color: '#4ade80', fontWeight: 800 }}>{score}</span>
                    </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                    레벨 {currentLevel}/{MAX_LEVELS}
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
                {/* 전체 음 표시 */}
                <div style={{ marginBottom: 60, width: '100%', maxWidth: 800, textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>순서대로 음을 눌러주세요</p>
                    {currentNotes.length > 0 ? (
                        <div style={{
                            display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {currentNotes.map((note, idx) => {
                                const info = NOTE_INFO[note];
                                const isPassed = idx < nextNoteIndex;
                                const isCurrent = idx === nextNoteIndex;

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            background: isPassed ? 'rgba(255,255,255,0.1)' : info.color,
                                            color: isPassed ? 'rgba(255,255,255,0.4)' : '#fff',
                                            padding: isCurrent ? '20px 28px' : '14px 20px',
                                            borderRadius: 12,
                                            fontWeight: 800,
                                            fontSize: isCurrent ? 32 : 24,
                                            minWidth: isCurrent ? 80 : 64,
                                            textAlign: 'center',
                                            border: isCurrent ? '3px solid #fbbf24' : 'none',
                                            boxShadow: isCurrent ? '0 0 20px rgba(251,191,36,0.6)' : 'none',
                                            transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative'
                                        }}
                                    >
                                        {info.korName}
                                        {isPassed && (
                                            <div style={{ position: 'absolute', top: -8, right: -8, background: '#4ade80', width: 24, height: 24, borderRadius: '50%', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>다음 레벨을 기다리는 중...</p>
                    )}
                </div>

                {/* 진행률 바 */}
                <div style={{ width: '100%', maxWidth: 400, marginBottom: 60 }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                        <div
                            style={{
                                background: 'linear-gradient(90deg, #3B82F6, #4ade80)',
                                height: '100%',
                                width: `${progress}%`,
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                </div>

                {/* 피아노 건반 */}
                <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 12 }}>
                    {PIANO_KEYS.map((key, idx) => {
                        const isNextNote = nextNoteToPlay === key.noteKey;
                        const noteInfo = NOTE_INFO[key.noteKey];
                        const keyColor = noteInfo.color;

                        return (
                            <button
                                key={key.name}
                                onClick={() => handlePianoKeyClick(key.noteKey)}
                                style={{
                                    background: keyColor,
                                    border: isNextNote ? '3px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    padding: '16px 12px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    minWidth: 50,
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isNextNote ? '0 0 20px rgba(251,191,36,0.6)' : 'none',
                                    transform: isNextNote ? 'scale(1.1)' : 'scale(1)',
                                    opacity: 0.9
                                }}
                            >
                                {key.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 통계 */}
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 24, justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>정확도</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>
                        {totalAttempts > 0 ? Math.round(correctCount / totalAttempts * 100) : 0}%
                    </p>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>속도</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#3B82F6' }}>
                        {speed.toFixed(1)}/초
                    </p>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>시도</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
                        {totalAttempts}회
                    </p>
                </div>
            </div>
        </div>
    );
}
