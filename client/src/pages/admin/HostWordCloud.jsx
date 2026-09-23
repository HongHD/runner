import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';
import { Play, Square } from 'lucide-react';

// 랜덤 색상 팔레트 (어두운 배경에서 잘 보이는 밝은 색상)
const WORD_COLORS = [
    '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa',
    '#2dd4bf', '#fb923c', '#a3e635', '#f87171', '#818cf8',
    '#38bdf8', '#4ade80', '#e879f9', '#facc15', '#c4b5fd',
    '#22d3ee', '#86efac', '#f9a8d4', '#fde68a', '#ddd6fe',
];

// 단어에 안정적인 색상 배정 (단어마다 고정 색상)
function getWordColor(word, index) {
    const code = word.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return WORD_COLORS[(code + index) % WORD_COLORS.length];
}

// 최소 글자 크기 ~ 최대 글자 크기 (count 기반)
function getFontSize(count, maxCount) {
    const min = 18;
    const max = 88;
    if (maxCount <= 1) return 36;
    return Math.round(min + ((count - 1) / (maxCount - 1)) * (max - min));
}

// 단어 배치: 컨테이너 안에 완전히 들어오도록 (우측 패널 220px 제외)
function placeWords(words, containerW, containerH) {
    const placed = [];
    const pad = 12;
    const usableW = containerW - 224; // 우측 TOP 패널 제외

    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const estW = Math.min(w.fontSize * 0.58 * w.word.length + pad, usableW * 0.85);
        const estH = w.fontSize + pad;

        const maxX = Math.max(usableW - estW - pad, pad);
        const maxY = Math.max(containerH - estH - pad, pad);

        let bestX = pad + Math.random() * maxX;
        let bestY = pad + Math.random() * maxY;

        for (let attempt = 0; attempt < 30; attempt++) {
            const tryX = pad + Math.random() * maxX;
            const tryY = pad + Math.random() * maxY;
            let overlaps = false;
            for (const p of placed) {
                if (
                    Math.abs(tryX - p.x) < (estW + p.estW) / 2 &&
                    Math.abs(tryY - p.y) < (estH + p.estH) / 2
                ) { overlaps = true; break; }
            }
            if (!overlaps) { bestX = tryX; bestY = tryY; break; }
        }
        placed.push({ ...w, x: bestX, y: bestY, estW, estH });
    }
    return placed;
}

// 단어별 고유 애니메이션 이름 생성 (다방향 이동)
function makeKeyframes(name, dx, dy, angle) {
    return `
        @keyframes ${name} {
            0%   { transform: translate(0px, 0px) rotate(0deg); }
            20%  { transform: translate(${dx * 0.6}px, ${-dy * 0.8}px) rotate(${angle * 0.3}deg); }
            40%  { transform: translate(${dx}px, ${-dy}px) rotate(${angle}deg); }
            60%  { transform: translate(${dx * 0.4}px, ${dy * 0.6}px) rotate(${-angle * 0.5}deg); }
            80%  { transform: translate(${-dx * 0.5}px, ${dy}px) rotate(${-angle}deg); }
            100% { transform: translate(0px, 0px) rotate(0deg); }
        }
    `;
}


// 개별 단어 컴포넌트 (다방향 둥둥 애니메이션)
function FloatingWord({ word, fontSize, color, x, y, delay, duration, animName }) {
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                fontSize,
                fontWeight: 900,
                color,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                textShadow: `0 0 20px ${color}55`,
                animation: `${animName} ${duration}s ease-in-out ${delay}s infinite`,
                transition: 'font-size 0.5s ease',
                letterSpacing: '0.02em',
                lineHeight: 1,
                pointerEvents: 'none',
            }}
        >
            {word}
        </div>
    );
}

export default function HostWordCloud() {
    const navigate = useNavigate();
    const { admin } = useAuthStore();
    const { setSocket, setRoomInfo } = useGameStore();

    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting | playing | ended
    const [participants, setParticipants] = useState([]);
    const [wordList, setWordList] = useState([]); // [{ word, count }]
    const [placedWords, setPlacedWords] = useState([]);
    const containerRef = useRef(null);
    const socketRef = useRef(null);

    const persistentPin = admin?.pinCode || 'WAIT..';

    // 단어 재배치 — 컨테이너 크기 기반
    const recalcLayout = useCallback((words) => {
        const doCalc = () => {
            if (!containerRef.current) return;
            const { clientWidth: W, clientHeight: H } = containerRef.current;
            if (W === 0 || H === 0) return;
            const maxCount = Math.max(...words.map(w => w.count), 1);
            const seed = (i, base) => ((i * 7 + 3) % 11) / 10 * base;
            const enriched = words.map((w, i) => ({
                ...w,
                fontSize: getFontSize(w.count, maxCount),
                color: getWordColor(w.word, i),
                delay: ((i * 1.1) % 3.5),
                duration: 6 + (i % 4) * 2,        // 6~14s 천천히
                animName: `wf_${i}`,
                dx: (seed(i, 28) - 14) * 1.2,      // ±16px 수평
                dy: (seed(i + 5, 26) - 13) * 1.2,  // ±15px 수직
                angle: (seed(i + 2, 6) - 3),        // ±3deg
            }));
            setPlacedWords(placeWords(enriched, W, H));
        };
        requestAnimationFrame(doCalc);
    }, []);

    useEffect(() => {
        if (!admin?.pinCode) return;

        setRoomInfo(admin.pinCode, 'Host');
        const currentSocket = window._adminSocket || io();
        if (!window._adminSocket) window._adminSocket = currentSocket;
        socketRef.current = currentSocket;
        setSocket(currentSocket);

        const doJoin = () => {
            setIsConnected(true);
            currentSocket.emit('admin_join', {
                pinCode: persistentPin,
                adminId: admin.id,
                gameTitle: '워드클라우드',
                gameType: 'word_cloud',
            });
        };

        currentSocket.on('connect', doJoin);
        if (currentSocket.connected) doJoin();

        currentSocket.on('online_participants', (data) => {
            setParticipants(data.participants || []);
        });

        currentSocket.on('participant_update', (data) => {
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) return prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p);
                    return [...prev, data.participant];
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p => p.id === data.participant.id ? { ...p, socketId: data.participant.socketId } : p));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        });

        currentSocket.on('admin_word_cloud_update', (data) => {
            const wl = data.wordList || [];
            setWordList(wl);
        });

        currentSocket.on('admin_game_ended', () => {
            setGameStatus('ended');
        });

        return () => {
            currentSocket.off('connect', doJoin);
            currentSocket.off('online_participants');
            currentSocket.off('participant_update');
            currentSocket.off('admin_word_cloud_update');
            currentSocket.off('admin_game_ended');
        };
    }, [admin?.pinCode]);

    // wordList 변경 시 레이아웃 재계산
    useEffect(() => {
        if (wordList.length > 0) {
            recalcLayout(wordList);
        } else {
            setPlacedWords([]);
        }
    }, [wordList, recalcLayout]);

    const handleStartGame = () => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;
        socket.emit('admin_start_game', {
            pinCode: persistentPin,
            gameTitle: '워드클라우드',
            gameType: 'word_cloud',
        });
        setGameStatus('playing');
        setWordList([]);
        setPlacedWords([]);
    };

    const handleEndGame = () => {
        const socket = socketRef.current;
        if (!socket || !isConnected) return;
        if (window.confirm('게임을 종료하시겠습니까? 참가자는 대기 화면으로 이동합니다.')) {
            socket.emit('admin_end_game', { pinCode: persistentPin });
            setGameStatus('ended');
        }
    };

    const handleExit = () => {
        if (window._adminSocket) {
            window._adminSocket.emit('admin_leave_game', { pinCode: persistentPin });
        }
        navigate('/admin/dashboard');
    };

    const totalWords = wordList.reduce((s, w) => s + w.count, 0);

    return (
        <>
            {/* 단어별 고유 애니메이션 keyframes */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.7); }
                    to   { opacity: 1; transform: scale(1); }
                }
                ${placedWords.map(w => makeKeyframes(w.animName || 'wf_0', w.dx || 0, w.dy || 0, w.angle || 0)).join('')}
            `}</style>

            <div style={{ minHeight: '100vh', background: '#040914', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                {/* 헤더 */}
                <header style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>☁️</span>
                        <h1 style={{ fontSize: 19, margin: 0, fontWeight: 800, color: '#fff' }}>
                            워드클라우드
                        </h1>
                        <span style={{
                            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                            padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 12,
                        }}>
                            PIN: {persistentPin}
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '2px 8px', borderRadius: 12,
                            background: gameStatus === 'playing' ? 'rgba(34,197,94,0.15)' : gameStatus === 'ended' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
                            color: gameStatus === 'playing' ? '#4ade80' : gameStatus === 'ended' ? '#f87171' : 'rgba(255,255,255,0.4)',
                            border: `1px solid ${gameStatus === 'playing' ? 'rgba(34,197,94,0.3)' : gameStatus === 'ended' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                            {gameStatus === 'playing' ? '🔴 진행중' : gameStatus === 'ended' ? '종료됨' : '대기중'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {/* 참가자 수 */}
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>
                            👥 {participants.length}명 · 단어 {totalWords}개
                        </span>

                        {/* 게임 시작 */}
                        <button
                            onClick={handleStartGame}
                            disabled={gameStatus === 'playing'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: gameStatus === 'playing' ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
                                border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
                                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                cursor: gameStatus === 'playing' ? 'not-allowed' : 'pointer',
                                opacity: gameStatus === 'playing' ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                        >
                            <Play size={15} fill="currentColor" />
                            {gameStatus === 'ended' ? '재시작' : '게임 시작'}
                        </button>

                        {/* 게임 종료 */}
                        <button
                            onClick={handleEndGame}
                            disabled={gameStatus !== 'playing'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                cursor: gameStatus !== 'playing' ? 'not-allowed' : 'pointer',
                                opacity: gameStatus !== 'playing' ? 0.45 : 1,
                            }}
                        >
                            <Square size={13} fill="currentColor" /> 게임 종료
                        </button>

                        {/* 나가기 */}
                        <button
                            onClick={handleExit}
                            style={{
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: 8,
                                fontSize: 13, cursor: 'pointer',
                            }}
                        >
                            나가기
                        </button>
                    </div>
                </header>

                {/* 메인 워드클라우드 영역 */}
                <main
                    ref={containerRef}
                    style={{
                        flex: 1, position: 'relative', overflow: 'hidden',
                        background: 'radial-gradient(ellipse at 50% 50%, #0a1628 0%, #040914 70%)',
                    }}
                >
                    {/* 배경 글로우 */}
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(96,165,250,0.04) 0%, transparent 70%)',
                    }} />

                    {/* 대기 메시지 */}
                    {gameStatus === 'waiting' && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 20,
                        }}>
                            <div style={{ fontSize: 72, filter: 'drop-shadow(0 0 24px rgba(96,165,250,0.4))' }}>☁️</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                워드클라우드 게임
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.8 }}>
                                게임을 시작하면 참가자가 단어를 입력할 수 있습니다.<br />
                                중복 단어일수록 더 크게 표시됩니다.
                            </div>
                            <div style={{
                                display: 'flex', gap: 24, marginTop: 12,
                                fontSize: 13, color: 'rgba(255,255,255,0.25)',
                            }}>
                                <span>☁️ 단어 최대 5개 입력</span>
                                <span>🎨 중복 많을수록 크게</span>
                                <span>🌈 랜덤 색상</span>
                            </div>
                        </div>
                    )}

                    {/* 게임 종료 메시지 (단어 없을 때만) */}
                    {gameStatus === 'ended' && wordList.length === 0 && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)',
                            fontSize: 16,
                        }}>
                            게임이 종료되었습니다.
                        </div>
                    )}

                    {/* 진행중이지만 단어 아직 없을 때 */}
                    {gameStatus === 'playing' && wordList.length === 0 && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 16,
                        }}>
                            <div style={{ fontSize: 48 }}>✍️</div>
                            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                                참가자의 단어를 기다리는 중...
                            </div>
                        </div>
                    )}

                    {/* 떠다니는 단어들 */}
                    {placedWords.map((item) => (
                        <FloatingWord
                            key={item.word}
                            word={item.word}
                            fontSize={item.fontSize}
                            color={item.color}
                            x={item.x}
                            y={item.y}
                            delay={item.delay}
                            duration={item.duration}
                            animName={item.animName || 'wf_0'}
                        />
                    ))}

                    {/* 우측 하단 단어 목록 패널 (작은 크기) */}
                    {wordList.length > 0 && (
                        <div style={{
                            position: 'absolute', bottom: 20, right: 20, width: 200,
                            background: 'rgba(4,9,20,0.85)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                            padding: '14px 16px', maxHeight: 260, overflowY: 'auto',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: '0.05em' }}>
                                TOP 단어
                            </div>
                            {[...wordList]
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 15)
                                .map((w, i) => (
                                    <div key={w.word} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '4px 0', borderBottom: i < wordList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                    }}>
                                        <span style={{ fontSize: 13, color: getWordColor(w.word, i), fontWeight: 700 }}>
                                            {w.word}
                                        </span>
                                        <span style={{
                                            fontSize: 11, color: 'rgba(255,255,255,0.4)',
                                            background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 8,
                                        }}>
                                            ×{w.count}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
