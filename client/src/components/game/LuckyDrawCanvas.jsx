import React, { useEffect, useRef, useCallback } from 'react';

const BALL_COLORS = [
    '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
    '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#818cf8',
    '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
];

export default function LuckyDrawCanvas({ participants, previousWinners, drawState, winner, allowDuplicateWinner = false }) {
    const canvasRef = useRef(null);
    const ballsRef = useRef([]);
    const animationRef = useRef();

    const R_CONTAINER = 220; // 유리구슬 컨테이너 반지름
    const BALL_RADIUS = 20;

    useEffect(() => {
        // 이미 추첨 중이면 공 목록 업데이트를 참음
        if (drawState !== 'ready') return;

        const currentBalls = ballsRef.current;
        // 제외할 참가자(이미 당첨된 사람) 필터링
        const eligibleParticipants = participants.filter(p => allowDuplicateWinner || !previousWinners.includes(p.name || p.nickname));

        // 탈락자 공 제거 및 남은 공 크기 초기화
        for (let i = currentBalls.length - 1; i >= 0; i--) {
            if (!eligibleParticipants.find(p => (p.name || p.nickname) === currentBalls[i].nickname)) {
                currentBalls.splice(i, 1);
            } else {
                currentBalls[i].radius = BALL_RADIUS; // 크기 초기화
            }
        }
        // 신규 참가자 공 추가
        eligibleParticipants.forEach((p, idx) => {
            const pName = p.name || p.nickname;
            if (!currentBalls.find(b => b.nickname === pName)) {
                // 원 범위 내 랜덤 위치 계산
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * (R_CONTAINER - BALL_RADIUS - 10);
                const x = r * Math.cos(angle);
                const y = r * Math.sin(angle);

                currentBalls.push({
                    nickname: pName,
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    color: BALL_COLORS[idx % BALL_COLORS.length],
                    radius: BALL_RADIUS,
                    isTarget: false
                });
            }
        });
    }, [participants, previousWinners, drawState, allowDuplicateWinner]);

    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const CX = W / 2;
        const CY = H / 2;

        ctx.resetTransform(); // 안전을 위해 변환 초기화
        ctx.clearRect(0, 0, W, H);

        const balls = ballsRef.current;

        // 물리 시뮬레이션 상태 적용
        const mixForce = drawState === 'mixing' ? 8 : (drawState === 'ready' ? 1.5 : 0);
        const gravity = drawState === 'ready' || drawState === 'mixing' ? 0.2 : 0; // 준비나 믹스 중 가벼운 중력 
        const bouncy = 0.9;

        balls.forEach((b, i) => {
            if (drawState === 'mixing') {
                b.vx += (Math.random() - 0.5) * mixForce;
                b.vy += (Math.random() - 0.5) * mixForce;
            } else if (drawState === 'ready') {
                b.vy += gravity; 
                b.vx += (Math.random() - 0.5) * 0.5;
            }

            if (drawState === 'mixing') {
                b.vx *= 0.98;
                b.vy *= 0.98;
            } else {
                b.vx *= 0.99;
                b.vy *= 0.99;
            }

            if (drawState === 'ready' || drawState === 'mixing') {
                b.x += b.vx;
                b.y += b.vy;

                const distCenter = Math.sqrt(b.x * b.x + b.y * b.y);
                if (distCenter > R_CONTAINER - b.radius) {
                    const nx = b.x / distCenter; 
                    const ny = b.y / distCenter;

                    const dot = b.vx * nx + b.vy * ny;
                    b.vx = (b.vx - 2 * dot * nx) * bouncy;
                    b.vy = (b.vy - 2 * dot * ny) * bouncy;

                    b.x = nx * (R_CONTAINER - b.radius);
                    b.y = ny * (R_CONTAINER - b.radius);
                }

                for (let j = i + 1; j < balls.length; j++) {
                    const b2 = balls[j];
                    const dx = b2.x - b.x;
                    const dy = b2.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = b.radius + b2.radius;
                    if (dist < minDist) {
                        const overlap = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        b.x -= nx * overlap / 2;
                        b.y -= ny * overlap / 2;
                        b2.x += nx * overlap / 2;
                        b2.y += ny * overlap / 2;

                        const tx = b.vx;
                        const ty = b.vy;
                        b.vx = b2.vx;
                        b.vy = b2.vy;
                        b2.vx = tx;
                        b2.vy = ty;
                    }
                }
            } else if (drawState === 'drawing' || drawState === 'result') {
                if (b.nickname === winner) {
                    b.x += (0 - b.x) * 0.05;
                    b.y += (0 - b.y) * 0.05;
                    b.radius += (80 - b.radius) * 0.05; 
                } else {
                    b.vy += 0.5;
                    b.y += b.vy;
                }
            }
        });

        ctx.save();
        ctx.translate(CX, CY);

        ctx.beginPath();
        ctx.arc(0, 0, R_CONTAINER, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-R_CONTAINER * 0.3, -R_CONTAINER * 0.3, R_CONTAINER * 0.4, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-R_CONTAINER * 0.3, -R_CONTAINER * 0.3, 0, -R_CONTAINER * 0.3, -R_CONTAINER * 0.3, R_CONTAINER * 0.4);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        balls.forEach(b => {
            const alpha = (drawState === 'drawing' || drawState === 'result') && b.nickname !== winner ? 0.2 : 1;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(b.radius, 0), 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(b.x - b.radius * 0.2, b.y - b.radius * 0.2, Math.max(b.radius * 0.4, 0), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `900 ${b.radius * 0.5}px 'Pretendard', sans-serif`;

            let text = b.nickname || '';
            if (text.length > 5 && b.radius < 40) text = text.substring(0, 4) + '..';
            ctx.fillText(text, b.x, b.y);
        });

        ctx.restore();

        animationRef.current = requestAnimationFrame(renderCanvas);
    }, [drawState, winner]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(renderCanvas);
        return () => cancelAnimationFrame(animationRef.current);
    }, [renderCanvas]);

    return (
        <div style={{
            width: 500, height: 500, position: 'relative',
            filter: drawState === 'result' ? 'drop-shadow(0 0 40px rgba(251,191,36,0.5))' : 'drop-shadow(0 0 20px rgba(255,255,255,0.05))',
            transition: 'filter 1s ease'
        }}>
            <canvas
                ref={canvasRef}
                width={500}
                height={500}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />
        </div>
    );
}
