import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { LayoutGrid, MessageSquare, Dices } from 'lucide-react';

/* ── 하드코딩된 게임 목업 데이터 ── */
const GAME_CATEGORIES = [
    {
        id: 'quiz',
        title: '퀴즈 · 경쟁',
        icon: LayoutGrid,
        color: '#a78bfa', // 보라색 계열 (스크린샷 분위기)
        items: [
            { id: 'g1', title: '4지선다형', desc: '객관식 퀴즈로 지식을 테스트', icon: '1234', badge: 'NEW', type: 'text-icon', bgColor: '#1e3a8a' },
            { id: 'g2', title: 'OX퀴즈', desc: 'O/X로 정답을 맞추는 퀴즈', icon: 'OX', badge: 'NEW', type: 'text-icon', textColor: '#ef4444' },
            { id: 'g3', title: '스피드 부저', desc: '가장 먼저 버저를 누른 사람 발표', icon: '🔔', badge: 'NEW', type: 'emoji' },
            { id: 'g4', title: '스피드 피아노', desc: '음계 순서 빠르게 치기 대결', icon: '🎹', badge: 'NEW', type: 'emoji' },
            { id: 'g5', title: '스피드 타일', desc: '섞인 타일 순서대로 완성 대결', icon: '🀄', badge: 'NEW', type: 'emoji' },
            { id: 'g6', title: '두더지 게임', desc: '올라오는 두더지 빠르게 잡기', icon: '🐹', badge: 'NEW', type: 'emoji', activeGlow: true },
            { id: 'g7', title: '버튼 배틀', desc: '제한 시간 내 버튼 최다 클릭 대결', icon: '👆', badge: 'NEW', type: 'emoji' },
            { id: 'g8', title: '스탑워치', desc: '정확한 시간에 멈추기 대결', icon: '⏱️', badge: 'NEW', type: 'emoji' },
        ]
    },
    {
        id: 'vote',
        title: '투표 · 소통',
        icon: MessageSquare,
        color: '#c084fc',
        items: [
            { id: 'g9', title: '공감투표', desc: '실시간 투표 결과 확인', icon: '🗳️', badge: 'NEW', type: 'emoji' },
            { id: 'g10', title: '실시간 설문', desc: '다중 설문 수집·실시간 결과 차트', icon: '📊', type: 'emoji' },
            { id: 'g11', title: '익명 Q&A', desc: '익명 질문 수집·좋아요 공감', icon: '❓', type: 'text-icon', textColor: '#ef4444' },
            { id: 'g12', title: '워드클라우드', desc: '키워드 실시간 시각화', icon: '☁️', type: 'emoji' },
            { id: 'g13', title: '게시판', desc: '실시간 의견 수집 & 교체', icon: '📋', badge: 'NEW', type: 'emoji' },
            { id: 'g14', title: '평가하기', desc: '별점 및 피드백 수집', icon: '⭐', badge: 'NEW', type: 'text-icon', textColor: '#fbbf24' },
            { id: 'g15', title: '그룹 만들기', desc: '랜덤 그룹 자동 배정', icon: '👥', badge: 'NEW', type: 'emoji' },
            { id: 'g16', title: '미션빙고', desc: '동성 미션 수행 빙고 게임', icon: '🎯', badge: '준비중', type: 'emoji', disabled: true },
            { id: 'g17', title: '스케치북', desc: '이미지·글 포스트 자유 게시판', icon: '📁', badge: 'NEW', type: 'emoji' },
        ]
    },
    {
        id: 'random',
        title: '랜덤 · 재미',
        icon: Dices,
        color: '#f472b6',
        items: [
            { id: 'g18', title: '행운권 추첨', desc: '무작위 당첨자 선정', icon: '🎫', badge: 'NEW', type: 'emoji' },
            { id: 'g19', title: '빙고', desc: '멀티플레이어 빙고', icon: '🎰', badge: 'NEW', type: 'emoji' },
            { id: 'g20', title: '팀 스프린트', desc: '팀별 탭 영산 속도 대결', icon: '🏃', badge: 'BETA', type: 'emoji', badgeColor: 'yellow' },
            { id: 'g21', title: '풍선 터뜨리기', desc: '팀 합산 타수로 풍선 먼저 터뜨리기', icon: '🎈', badge: 'NEW', type: 'emoji' },
            { id: 'g22', title: '초성게임', desc: '팀별 초성 단어 완성 대결', icon: 'abc', badge: 'NEW', type: 'text-icon', bgColor: '#2563eb', fontSize: 18 },
            { id: 'g23', title: '메모리게임', desc: '카드 짝 맞추기 최소 시도 경쟁', icon: '🧩', badge: 'NEW', type: 'emoji' },
            { id: 'g24', title: '가위바위보', desc: '1:1 토너먼트 가위바위보 대결', icon: '✂️', badge: 'NEW', type: 'emoji' },
            { id: 'g25', title: '핀볼 추첨기', desc: '물리 기반 랜덤 추첨·동일 출발', icon: '🎯', badge: 'NEW', type: 'emoji' },
            { id: 'g26', title: '유리징검다리', desc: '오징어게임·진짜유리를 찾아라', icon: '☒', badge: '준비중', type: 'text-icon', textColor: 'var(--rvd-text-dim)', disabled: true },
            { id: 'g27', title: '줄다리기', desc: '오징어게임·팀 합산 탭으로 줄 당기기', icon: '☒', badge: '준비중', type: 'text-icon', textColor: 'var(--rvd-text-dim)', disabled: true },
            { id: 'g28', title: '사다리 게임', desc: '사다리 타고 내려가는 랜덤 경품 게임', icon: '🪜', badge: 'NEW', type: 'emoji' },
        ]
    }
];

export default function GameManagement() {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);
    const [activeGames, setActiveGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGameTypes = async () => {
            try {
                const res = await axios.get('/api/game-types', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const active = (res.data || []).filter(g => g.is_active).map(g => g.name);
                setActiveGames(active);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchGameTypes();
    }, [token]);

    if (loading) {
        return <div style={{ padding: 40, color: 'var(--rvd-text-dim)' }}>게임 목록을 불러오는 중...</div>;
    }

    // GAME_CATEGORIES에서 activeGames에 포함된 게임만 필터링
    const filteredCategories = GAME_CATEGORIES.map(category => ({
        ...category,
        items: category.items.filter(game => activeGames.includes(game.title))
    })).filter(category => category.items.length > 0);

    return (
        <div className="animate-fade-up" style={{ paddingBottom: 60 }}>
            {/* ── 헤더 ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <div className="page-title">게임 목록</div>
                    <div className="page-breadcrumb">// GAMES · 컨텐츠 갤러리</div>
                </div>
            </div>

            {filteredCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 100, color: 'var(--rvd-text-dim)' }}>
                    현재 활성화된 게임이 없습니다. [게임 등록]에서 사용할 게임을 활성화해주세요.
                </div>
            ) : (
                filteredCategories.map((category) => (
                    <div key={category.id} style={{ marginBottom: 48 }}>
                        {/* 섹션 제목 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <category.icon size={16} style={{ color: category.color }} />
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--rvd-text-dim)', margin: 0 }}>
                                {category.title}
                            </h2>
                        </div>

                        {/* 그리드 */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 16
                        }}>
                            {category.items.map((game) => {
                                const isHovered = hoveredCard === game.id;
                                const isGlowing = game.activeGlow;
                                const isDisabled = game.disabled;

                                return (
                                    <div
                                        key={game.id}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            if (game.id === 'g2') {
                                                navigate('/admin/game-design/ox');
                                            } else if (game.id === 'g1') {
                                                navigate('/admin/game-design/multiple_choice');
                                            } else if (game.id === 'g6') {
                                                navigate('/admin/game-design/mole');
                                            } else if (game.id === 'g3') {
                                                navigate('/admin/game/speed-buzzer/play');
                                            } else if (game.id === 'g4') {
                                                // 스피드 피아노 - 먼저 게임을 생성하거나 조회
                                                navigate('/admin/game/speed-piano/1/play');
                                            } else if (game.id === 'g5') {
                                                navigate('/admin/game/speed-tile/1/play');
                                            } else if (game.id === 'g10') {
                                                navigate('/admin/game/realtime-survey/play');
                                            } else if (game.id === 'g13') {
                                                navigate('/admin/game/board/play');
                                            } else if (game.id === 'g8') {
                                                navigate('/admin/game/stopwatch/play');
                                            } else if (game.id === 'g7') {
                                                navigate('/admin/game/button_battle/play');
                                            } else if (game.id === 'g9') {
                                                navigate('/admin/game/empathy-vote/play');
                                            } else if (game.id === 'g12') {
                                                navigate('/admin/game/word-cloud/play');
                                            } else if (game.id === 'g18') {
                                                navigate('/admin/game/lucky-draw/play');
                                            } else if (game.id === 'g28') {
                                                navigate('/admin/game/ladder/play');
                                            } else {
                                                navigate('/admin/game/create');
                                            }
                                        }}
                                        onMouseEnter={() => !isDisabled && setHoveredCard(game.id)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                        style={{
                                            position: 'relative',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isHovered || isGlowing ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.05)'}`,
                                            borderRadius: 16,
                                            padding: '24px 20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            transform: isHovered && !isDisabled ? 'translateY(-4px)' : 'none',
                                            boxShadow: (isHovered && !isDisabled) || isGlowing
                                                ? '0 12px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.5)'
                                                : '0 4px 12px rgba(0,0,0,0.2)',
                                            opacity: isDisabled ? 0.4 : 1,
                                        }}
                                    >
                                        {/* 뱃지 */}
                                        {game.badge && (
                                            <div style={{
                                                position: 'absolute',
                                                top: 12, right: 12,
                                                background: game.badge === '준비중' ? 'rgba(239, 68, 68, 0.15)'
                                                    : game.badgeColor === 'yellow' ? 'rgba(234, 179, 8, 0.15)'
                                                        : 'rgba(34, 197, 94, 0.15)',
                                                color: game.badge === '준비중' ? '#ef4444'
                                                    : game.badgeColor === 'yellow' ? '#fde047'
                                                        : '#4ade80',
                                                border: `1px solid ${game.badge === '준비중' ? 'rgba(239, 68, 68, 0.3)'
                                                    : game.badgeColor === 'yellow' ? 'rgba(234, 179, 8, 0.3)'
                                                        : 'rgba(34, 197, 94, 0.3)'}`,
                                                padding: '2px 8px',
                                                borderRadius: 12,
                                                fontSize: 9,
                                                fontWeight: 800,
                                                letterSpacing: '0.05em'
                                            }}>
                                                {game.badge}
                                            </div>
                                        )}

                                        {/* 아이콘 */}
                                        <div style={{
                                            width: 48, height: 48,
                                            marginBottom: 16,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: game.fontSize || 32,
                                            background: game.bgColor || 'transparent',
                                            color: game.textColor || 'inherit',
                                            borderRadius: game.bgColor ? 8 : 0,
                                            fontWeight: 900,
                                            fontFamily: game.type === 'text-icon' ? 'Orbitron, sans-serif' : 'inherit'
                                        }}>
                                            {game.icon}
                                        </div>

                                        {/* 텍스트 */}
                                        <h3 style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: '#fff',
                                            marginBottom: 6,
                                            marginTop: 0
                                        }}>
                                            {game.title}
                                        </h3>
                                        <p style={{
                                            fontSize: 11,
                                            color: 'var(--rvd-text-dim)',
                                            margin: 0,
                                            lineHeight: 1.4,
                                            wordBreak: 'keep-all'
                                        }}>
                                            {game.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
