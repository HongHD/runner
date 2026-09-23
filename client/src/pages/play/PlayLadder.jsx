import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/gameStore';
import { io } from 'socket.io-client';

/* 경로 추적 유틸 */
function tracePath(startCol, ladderCount, rowCount, bars) {
    let col = startCol;
    const path = [{ row: -1, col }];
    for (let row = 0; row < rowCount; row++) {
        const barR = bars.find(b => b.row === row && b.col === col);
        const barL = bars.find(b => b.row === row && b.col === col - 1);
        if (barR) col += 1;
        else if (barL) col -= 1;
        path.push({ row, col });
    }
    return path;
}

/* Canvas 렌더링 */
function drawPlayerLadder(canvas, { ladderCount, rowCount, bars, myLadderIndex, prizes, myPath, emojiProgress, isDone }) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const PAD_X = 40, PAD_TOP = 50, PAD_BOT = 56;
    const colW = (W - PAD_X * 2) / (Math.max(ladderCount - 1, 1));
    const rowH = (H - PAD_TOP - PAD_BOT) / (rowCount || 1);
    const cx = (c) => PAD_X + c * colW;
    const ry = (r) => PAD_TOP + r * rowH;

    // 수직선
    for (let c = 0; c < ladderCount; c++) {
        ctx.strokeStyle = c === myLadderIndex ? '#00d4ff' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = c === myLadderIndex ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(cx(c), PAD_TOP);
        ctx.lineTo(cx(c), H - PAD_BOT);
        ctx.stroke();
    }

    // 가로 막대
    bars.forEach(({ row, col }) => {
        const y = ry(row) + rowH / 2;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx(col), y);
        ctx.lineTo(cx(col + 1), y);
        ctx.stroke();
    });

    // 내 경로 강조 (완료 후)
    if (isDone && myPath) {
        ctx.strokeStyle = 'rgba(255,215,0,0.6)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        myPath.forEach((pt, i) => {
            const x = cx(pt.col);
            const y = pt.row < 0 ? PAD_TOP - 10 : ry(pt.row);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    // 경품 박스
    prizes.forEach((prize, i) => {
        const x = cx(i);
        const isMyPrize = isDone && myPath && myPath[myPath.length - 1]?.col === i;
        ctx.fillStyle = isMyPrize ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(x - 24, H - PAD_BOT + 4, 48, 24, 6);
        ctx.fill();
        ctx.fillStyle = isMyPrize ? '#ffd700' : 'rgba(255,255,255,0.4)';
        ctx.font = `bold ${isMyPrize ? 11 : 10}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        const label = prize.length > 4 ? prize.slice(0, 4) + '..' : prize;
        ctx.fillText(label, x, H - PAD_BOT + 20);
    });

    // 이모지 움직임
    if (myPath && emojiProgress !== undefined) {
        const idx = Math.min(Math.floor(emojiProgress * (myPath.length - 1)), myPath.length - 1);
        const pt = myPath[idx];
        const y = pt.row < 0 ? PAD_TOP - 20 : ry(pt.row);
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🙂', cx(pt.col), y + 10);
    }
}

export default function PlayLadder() {
    const { socket, setSocket, pinCode, nickname, participantId, team, resetGame } = useGameStore();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('waiting'); // waiting | playing | result
    const [gameData, setGameData] = useState(null);
    const [myLadderIndex, setMyLadderIndex] = useState(null);
    const [myPath, setMyPath] = useState(null);
    const [myPrize, setMyPrize] = useState(null);
    const [emojiProgress, setEmojiProgress] = useState(0);

    const canvasRef = useRef(null);
    const animRef = useRef(null);

    /* Socket 연결 */
    useEffect(() => {
        let sock = socket;
        if (!sock) {
            if (window._playerSocket?.connected) {
                sock = window._playerSocket;
                setSocket(sock);
            } else if (pinCode && nickname) {
                sock = io();
                window._playerSocket = sock;
                setSocket(sock);
                sock.on('connect', () => sock.emit('player_join', { pinCode, nickname, participantId }));
                sock.on('join_error', (d) => { alert(d.message); resetGame(); navigate('/play'); });
            } else {
                navigate('/play');
                return;
            }
        }

        const onGameEnded = () => navigate('/play/lobby');
        const onAdminLeft = () => navigate('/play/lobby');

        const onLadderStarted = (data) => {
            setGameData(data);

            // 내 사다리 인덱스 찾기
            const mode = data.mode;
            const myIdentifier = mode === 'team' ? team : nickname;
            const myAssign = data.assignments.find(a => a.name === myIdentifier);
            const ladderIdx = myAssign ? myAssign.ladderIndex : null;
            setMyLadderIndex(ladderIdx);

            // 내 경로 계산
            if (ladderIdx !== null) {
                const path = tracePath(ladderIdx, data.ladderCount, data.rowCount, data.bars);
                setMyPath(path);
                const prizeIdx = data.results[ladderIdx];
                setMyPrize(data.prizes[prizeIdx] || '?');
            }
            setPhase('playing');

            // 애니메이션 시작
            let prog = 0;
            const DURATION = 4000;
            const t0 = Date.now();
            const tick = () => {
                prog = Math.min((Date.now() - t0) / DURATION, 1);
                setEmojiProgress(prog);
                if (prog < 1) animRef.current = requestAnimationFrame(tick);
                else setTimeout(() => setPhase('result'), 500);
            };
            animRef.current = requestAnimationFrame(tick);
        };

        sock.on('game_ended', onGameEnded);
        sock.on('admin_left', onAdminLeft);
        sock.on('ladder_game_started', onLadderStarted);

        return () => {
            sock.off('game_ended', onGameEnded);
            sock.off('admin_left', onAdminLeft);
            sock.off('ladder_game_started', onLadderStarted);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [socket, pinCode, nickname]);

    /* Canvas 렌더 */
    useEffect(() => {
        if (!canvasRef.current || !gameData || phase === 'waiting') return;
        drawPlayerLadder(canvasRef.current, {
            ladderCount: gameData.ladderCount,
            rowCount: gameData.rowCount,
            bars: gameData.bars,
            myLadderIndex,
            prizes: gameData.prizes,
            myPath,
            emojiProgress: phase === 'playing' ? emojiProgress : 1,
            isDone: phase === 'result',
        });
    }, [phase, gameData, myPath, emojiProgress]);

    /* ── 대기 화면 ── */
    if (phase === 'waiting') {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 24 }}>
                <div style={{ fontSize: 80, marginBottom: 24 }}>🪜</div>
                <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 12px' }}>사다리 게임</h2>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 36px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                        호스트가 사다리를 설정하고<br />게임을 시작할 때까지 기다려주세요!
                    </p>
                    <div style={{ marginTop: 20, padding: '8px 16px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, fontSize: 13, color: '#00d4ff', fontWeight: 700 }}>
                        {nickname}
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    /* ── 결과 화면 ── */
    if (phase === 'result') {
        const isWin = myPrize && (myPrize.includes('당첨') || myPrize.includes('1등') || myPrize.includes('1위') || myPrize.includes('상'));
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', padding: '24px 16px', overflowY: 'auto' }}>
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>🪜 사다리 게임 결과</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{nickname}님의 결과</div>
                </div>

                {/* 사다리 캔버스 (결과 표시) */}
                <canvas ref={canvasRef} width={340} height={380} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, maxWidth: '100%' }} />

                {/* 결과 카드 */}
                {myPrize !== null && (
                    <div style={{ background: isWin ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${isWin ? '#ffd700' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '24px 32px', textAlign: 'center', maxWidth: 300, width: '100%', boxShadow: isWin ? '0 0 40px rgba(255,215,0,0.3)' : 'none', animation: 'pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
                        <div style={{ fontSize: 52, marginBottom: 12 }}>{isWin ? '🎉' : '😢'}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: isWin ? '#ffd700' : '#fff', marginBottom: 8 }}>{myPrize}</div>
                        <div style={{ fontSize: 14, color: isWin ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.4)' }}>
                            {isWin ? '축하합니다! 🎊' : '아쉽지만 다음 기회에!'}
                        </div>
                    </div>
                )}

                {myLadderIndex === null && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                        이번 게임에 배정되지 않았습니다.
                    </div>
                )}

                <style>{`
                    @keyframes pop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    /* ── 플레이 중 화면 ── */
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '24px 16px' }}>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>🪜 사다리 타는 중...</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    {myLadderIndex !== null ? `${nickname}님 — ${myLadderIndex + 1}번 사다리` : '관전 중'}
                </div>
            </div>
            <canvas ref={canvasRef} width={340} height={420} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '100%' }} />
        </div>
    );
}
