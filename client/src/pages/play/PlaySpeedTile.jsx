import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

export default function PlaySpeedTile() {
    const { socket, setSocket, pinCode, nickname, participantId, resetGame } = useGameStore();
    const navigate = useNavigate();

    const [gameStarted, setGameStarted] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [targetSequence, setTargetSequence] = useState([]);
    const [gridTiles, setGridTiles] = useState([]);
    const [nextNoteIndex, setNextNoteIndex] = useState(0);

    const [score, setScore] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);

    // 랭킹 관련
    const [showRanking, setShowRanking] = useState(false);
    const [rankingData, setRankingData] = useState([]);

    const [timeLeft, setTimeLeft] = useState(0);

    const levelStartTimeRef = useRef(Date.now());
    const gameStartTimeRef = useRef(Date.now());

    // 클릭된 타일 피드백용
    const [clickedTile, setClickedTile] = useState(null);
    const [isCorrectClick, setIsCorrectClick] = useState(null);

    // 소켓 재연결 처리 (새로고침 대응)
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

                newSocket.on('join_error', (data) => {
                    alert(data.message);
                    window._playerSocket = null;
                    resetGame();
                    navigate('/play');
                });
            } else {
                navigate('/play');
            }
        } else {
            // 이미 소켓이 연결되어 있고 마운트 되는 경우 (다른 게임을 갔다가 다시 로비로 와서 진입한 경우 등)
            // 컴포넌트 상태를 모두 초기화 (이전 종료화면이 남지 않도록)
            setGameStarted(false);
            setCurrentLevel(0);
            setTargetSequence([]);
            setGridTiles([]);
            setNextNoteIndex(0);
            setScore(0);
            setGameEnded(false);
            setShowRanking(false);
            setTimeLeft(0);
            setClickedTile(null);
            setIsCorrectClick(null);
        }
    }, [socket, pinCode, nickname, setSocket, resetGame, navigate]);

    // 5초 타이머 카운트다운
    useEffect(() => {
        let timerId;
        if (gameStarted && !gameEnded && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerId);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [gameStarted, gameEnded, timeLeft]);

    useEffect(() => {
        if (!socket) return;

        const handleGameStarted = (data) => {
            setGameStarted(true);
            gameStartTimeRef.current = Date.now();
            setCurrentLevel(0);
            setTargetSequence([]);
            setGridTiles([]);
            setNextNoteIndex(0);
            setScore(0);
            setGameEnded(false);
            setShowRanking(false);
            setTimeLeft(0);
        };

        const handleSpeedTileLevel = (data) => {
            // data: { level, sequence, grid }
            setGameStarted(true);
            if (gameStartTimeRef.current === 0) {
                gameStartTimeRef.current = Date.now();
            }

            setCurrentLevel(data.level);
            setTargetSequence(data.sequence);
            setGridTiles(data.grid);
            setNextNoteIndex(0);
            setTimeLeft(5); // 5초 세팅
            levelStartTimeRef.current = Date.now();
            setClickedTile(null);
            setIsCorrectClick(null);
        };

        const handleGameEnded = () => {
            setGameEnded(true);
        };

        const handlePlayerRankingData = (data) => {
            setRankingData(data.ranking);
            setShowRanking(true);
        };

        const handleAdminLeft = () => {
            navigate('/play/lobby');
        };

        const handleForceLogout = () => {
            if (socket) socket.disconnect();
            resetGame();
            navigate('/play');
        };

        // 내 점수 업데이트
        const handleScoreUpdate = (data) => {
            if (data.participantId === participantId && data.score !== undefined) {
                setScore(data.score);
            }
        };

        socket.on('game_started', handleGameStarted);
        socket.on('speed_tile_level', handleSpeedTileLevel);
        socket.on('game_ended', handleGameEnded);
        socket.on('player_ranking_data', handlePlayerRankingData);
        socket.on('admin_left', handleAdminLeft);
        socket.on('force_logout_user', handleForceLogout);
        socket.on('player_speed_tile_update', handleScoreUpdate);

        return () => {
            socket.off('game_started', handleGameStarted);
            socket.off('speed_tile_level', handleSpeedTileLevel);
            socket.off('game_ended', handleGameEnded);
            socket.off('player_ranking_data', handlePlayerRankingData);
            socket.off('admin_left', handleAdminLeft);
            socket.off('force_logout_user', handleForceLogout);
            socket.off('player_speed_tile_update', handleScoreUpdate);
        };
    }, [socket, navigate, participantId, resetGame]);

    const handleTileClick = (tileValue, idx) => {
        if (!gameStarted || gameEnded || targetSequence.length === 0) return;
        if (nextNoteIndex >= targetSequence.length) return;
        if (timeLeft <= 0) return;

        const targetValue = targetSequence[nextNoteIndex];
        const isCorrect = (tileValue === targetValue);

        const elapsedMs = Date.now() - levelStartTimeRef.current;
        const totalTime = Math.max(1, Date.now() - gameStartTimeRef.current);

        // 시각 피드백
        setClickedTile(idx);
        setIsCorrectClick(isCorrect);
        setTimeout(() => {
            setClickedTile(null);
            setIsCorrectClick(null);
        }, 300);

        // 클라이언트 사이드 예측: 맞으면 index 증가
        if (isCorrect) {
            setNextNoteIndex(prev => prev + 1);
        }

        if (socket) {
            socket.emit('player_speed_tile_click', {
                pinCode,
                level: currentLevel,
                noteIndex: nextNoteIndex,
                isCorrect,
                elapsedMs,
                totalTime
            });
        }
    };

    if (showRanking && rankingData) {
        const handleGoToLobby = () => {
            setShowRanking(false);
            setGameEnded(false);
            setGameStarted(false);
            setScore(0);
            navigate('/play/lobby');
        };
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 500, padding: 24 }}>
                    <h1 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, marginBottom: 24, color: '#fcd34d' }}>🏆 최종 게임 결과</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                        {rankingData.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>결과 데이터가 없습니다.</p>
                        ) : rankingData.map((p, i) => {
                            const isMe = p.id === participantId || p.name === nickname;
                            return (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', padding: '16px 20px',
                                    background: isMe ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: 12, border: isMe ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ fontSize: 20, width: 40, fontWeight: 800, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</div>
                                    <div style={{ flex: 1, fontWeight: isMe ? 800 : 500, fontSize: 16 }}>{p.name}</div>
                                    <div style={{ fontWeight: 800, color: '#4ade80', fontSize: 16 }}>{p.score}점</div>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={handleGoToLobby}
                        style={{
                            width: '100%', padding: '14px 0', borderRadius: 12,
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: '#fff', fontWeight: 800, fontSize: 16,
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        🚪 나가기 (대기실로)
                    </button>
                </div>
            </div>
        );
    }


    if (gameEnded) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>🀄 게임 종료</h1>
                    <p style={{ fontSize: 18, marginBottom: 32 }}>최종 점수: <span style={{ color: '#4ade80', fontWeight: 800 }}>{score}점</span></p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>호스트가 순위를 확인 중입니다...</p>
                </div>
            </div>
        );
    }

    if (!gameStarted) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>🀄 스피드 타일</h1>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>게임 시작을 기다리는 중...</p>
                    <div style={{ width: 48, height: 48, border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // 게임 진행 중 (레벨 데이터가 오기 전 잠깐 대기)
    if (gridTiles.length === 0) {
        return (
            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>🀄 스피드 타일</h1>
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>레벨 준비 중...</p>
                </div>
            </div>
        );
    }

    const columns = 5;
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 10,
        maxWidth: 600,
        margin: '0 auto',
        width: '100%',
        opacity: timeLeft > 0 ? 1 : 0.5,
        pointerEvents: timeLeft > 0 ? 'auto' : 'none'
    };

    return (
        <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        🀄 스피드 타일
                    </h1>
                    <div style={{ fontSize: 11, color: 'rgba(0,212,255,0.8)', marginTop: 3 }}>
                        {nickname} · 점수: <span style={{ color: '#4ade80', fontWeight: 800 }}>{score}</span>
                    </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                    레벨 {currentLevel} | ⏳ <span style={{ color: timeLeft > 0 ? '#fbbf24' : '#ef4444', fontWeight: 800 }}>{timeLeft}초</span>
                </div>
            </header>

            {/* 메인 콘텐츠 */}
            <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                {/* 타겟 시퀀스 */}
                <div style={{ marginBottom: 28, width: '100%', maxWidth: 640 }}>
                    <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                        순서대로 아래 동물들을 클릭하세요
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                        {targetSequence.map((animal, idx) => {
                            const isPassed = idx < nextNoteIndex;
                            const isCurrent = idx === nextNoteIndex;
                            return (
                                <div key={idx} style={{
                                    width: isCurrent ? 60 : 46,
                                    height: isCurrent ? 60 : 46,
                                    fontSize: isCurrent ? 30 : 22,
                                    background: isPassed ? 'rgba(74,222,128,0.1)' : isCurrent ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                                    borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: isCurrent ? '2px solid #fbbf24' : isPassed ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: isCurrent ? '0 0 16px rgba(251,191,36,0.4)' : 'none',
                                    position: 'relative',
                                    opacity: isPassed ? 0.5 : 1,
                                    transition: 'all 0.15s'
                                }}>
                                    {animal}
                                    {isPassed && (
                                        <div style={{ position: 'absolute', top: -6, right: -6, background: '#4ade80', width: 16, height: 16, borderRadius: '50%', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 시간 초과 / 성공 메시지 */}
                {timeLeft === 0 && targetSequence.length > 0 && nextNoteIndex < targetSequence.length && (
                    <p style={{ marginBottom: 16, color: '#ef4444', fontWeight: 700, fontSize: 16 }}>⏰ 시간 종료! 호스트가 다음 레벨로 진행합니다.</p>
                )}
                {nextNoteIndex >= targetSequence.length && targetSequence.length > 0 && (
                    <p style={{ marginBottom: 16, color: '#4ade80', fontWeight: 700, fontSize: 16 }}>🎉 성공! 호스트가 다음 레벨로 진행합니다.</p>
                )}

                {/* 게임 그리드 */}
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 20 }}>
                    <div style={gridStyle}>
                        {gridTiles.map((animal, idx) => {
                            const isClicked = clickedTile === idx;
                            const bgColor = isClicked
                                ? (isCorrectClick ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)')
                                : 'rgba(255,255,255,0.08)';
                            const borderColor = isClicked
                                ? (isCorrectClick ? '#4ade80' : '#ef4444')
                                : 'rgba(255,255,255,0.1)';
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleTileClick(animal, idx)}
                                    style={{
                                        aspectRatio: '1/1',
                                        background: bgColor,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: 12,
                                        fontSize: 32,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: timeLeft > 0 ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.1s ease',
                                        boxShadow: isClicked ? '0 0 12px rgba(255,255,255,0.2)' : '0 2px 6px rgba(0,0,0,0.2)',
                                        transform: isClicked ? 'scale(0.92)' : 'scale(1)',
                                        WebkitTapHighlightColor: 'transparent',
                                        outline: 'none',
                                    }}
                                >
                                    {animal}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
