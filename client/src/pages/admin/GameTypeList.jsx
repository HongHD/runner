import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { Save, CheckSquare, Square, ChevronDown, ChevronUp, Search, Gamepad2 } from 'lucide-react';

/* ── 카테고리별 색상/아이콘 설정 ── */
const CATEGORY_STYLE = {
    '퀴즈·경쟁': { color: 'var(--rvd-cyan)', bg: 'var(--rvd-cyan-dim)', border: 'rgba(0,212,255,0.2)' },
    '투표·소통': { color: 'var(--rvd-yellow)', bg: 'var(--rvd-yellow-dim)', border: 'rgba(255,215,0,0.2)' },
    '랜덤·재미': { color: 'var(--rvd-green)', bg: 'var(--rvd-green-dim)', border: 'rgba(0,255,136,0.2)' },
};

const BADGE_STYLE = {
    NEW: { bg: 'rgba(0,212,255,0.18)', color: 'var(--rvd-cyan)', label: 'NEW' },
    HOT: { bg: 'rgba(255,80,80,0.18)', color: '#ff5050', label: 'HOT' },
    BETA: { bg: 'rgba(255,215,0,0.18)', color: 'var(--rvd-yellow)', label: 'BETA' },
};

function Badge({ badge }) {
    if (!badge) return null;
    const s = BADGE_STYLE[badge] || BADGE_STYLE.NEW;
    return (
        <span style={{
            background: s.bg, color: s.color,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
            padding: '2px 6px', borderRadius: 4,
        }}>{s.label}</span>
    );
}

/* ── 개별 게임 행 ── */
function GameRow({ game, checked, onToggle, navigate }) {
    const cs = CATEGORY_STYLE[game.category] || CATEGORY_STYLE['퀴즈·경쟁'];
    return (
        <tr
            onClick={() => onToggle(game.id)}
            style={{ cursor: 'pointer', transition: 'background 0.15s' }}
            className="game-type-row"
        >
            <td style={{ padding: '0 16px', width: 140 }}>
                <span style={{
                    fontSize: 11, color: cs.color,
                    background: cs.bg,
                    border: `1px solid ${cs.border}`,
                    padding: '2px 8px', borderRadius: 4,
                    fontWeight: 600,
                }}>
                    {game.category_icon} {game.category}
                </span>
            </td>
            <td style={{ padding: '0 12px', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{game.name}</span>
                    <Badge badge={game.badge} />
                </div>
            </td>
            <td style={{ padding: '0 12px', color: 'var(--rvd-text-dim)', fontSize: 13 }}>
                {game.description}
            </td>
            <td style={{ padding: '0 12px', width: 100, textAlign: 'center' }}>
                {game.name === '4지선다형' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/game-design/multiple_choice'); }}
                        className="rvd-btn"
                        style={{
                            background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)',
                            border: '1px solid rgba(0,212,255,0.25)', fontSize: 11, padding: '4px 10px',
                            fontWeight: 600, letterSpacing: '0.05em'
                        }}
                    >
                        게임설계
                    </button>
                )}
                {game.name === 'OX퀴즈' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/game-design/ox'); }}
                        className="rvd-btn"
                        style={{
                            background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)',
                            border: '1px solid rgba(0,212,255,0.25)', fontSize: 11, padding: '4px 10px',
                            fontWeight: 600, letterSpacing: '0.05em', marginTop: game.name === 'OX퀴즈' ? 0 : 4
                        }}
                    >
                        게임설계
                    </button>
                )}
                {game.name === '두더지 게임' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/game-design/mole'); }}
                        className="rvd-btn"
                        style={{
                            background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)',
                            border: '1px solid rgba(0,212,255,0.25)', fontSize: 11, padding: '4px 10px',
                            fontWeight: 600, letterSpacing: '0.05em', marginTop: 4 // in case multiple buttons, but currently exclusive
                        }}
                    >
                        게임설계
                    </button>
                )}
                {game.name === '스탑워치' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate('/admin/game-design/stopwatch'); }}
                        className="rvd-btn"
                        style={{
                            background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)',
                            border: '1px solid rgba(0,212,255,0.25)', fontSize: 11, padding: '4px 10px',
                            fontWeight: 600, letterSpacing: '0.05em', marginTop: 4
                        }}
                    >
                        게임설계
                    </button>
                )}
            </td>
            <td style={{ padding: '0 20px', width: 80, textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22,
                    borderRadius: 5,
                    border: checked ? 'none' : '1.5px solid var(--rvd-border2)',
                    background: checked ? 'var(--rvd-cyan)' : 'rgba(255,255,255,0.04)',
                    transition: 'all 0.15s',
                    boxShadow: checked ? '0 0 10px var(--rvd-cyan-glow)' : 'none',
                }}>
                    {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* ── 카테고리 섹션 ── */
function CategorySection({ category, games, checkedIds, onToggle, onToggleAll, isOpen, onOpenToggle, navigate }) {
    const cs = CATEGORY_STYLE[category] || CATEGORY_STYLE['퀴즈·경쟁'];
    const checkedInCat = games.filter(g => checkedIds.has(g.id)).length;
    const allChecked = checkedInCat === games.length;

    return (
        <div style={{ marginBottom: 6 }}>
            {/* 카테고리 헤더 */}
            <div
                onClick={onOpenToggle}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px',
                    background: cs.bg,
                    borderLeft: `3px solid ${cs.color}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                <span style={{ color: cs.color, fontSize: 14, fontWeight: 700 }}>
                    {games[0]?.category_icon} {category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--rvd-text-dim)', marginLeft: 4 }}>
                    {checkedInCat} / {games.length} 활성화
                </span>
                {/* 카테고리 전체 토글 버튼 */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleAll(games, !allChecked); }}
                    style={{
                        marginLeft: 'auto',
                        background: allChecked ? cs.bg : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${allChecked ? cs.color : 'var(--rvd-border2)'}`,
                        color: allChecked ? cs.color : 'var(--rvd-text-dim)',
                        borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                >
                    {allChecked ? '전체 해제' : '전체 선택'}
                </button>
                <span style={{ color: 'var(--rvd-text-dim)', display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
            </div>

            {/* 게임 목록 */}
            {isOpen && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {games.map(game => (
                            <GameRow
                                key={game.id}
                                game={game}
                                checked={checkedIds.has(game.id)}
                                onToggle={onToggle}
                                navigate={navigate}
                            />
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

/* ── 메인 페이지 ── */
export default function GameTypeList() {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const headers = { Authorization: `Bearer ${token}` };

    const [gameTypes, setGameTypes] = useState([]);
    const [checkedIds, setCheckedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [openCats, setOpenCats] = useState({});
    const [toastMsg, setToastMsg] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    /* 초기 활성화 상태 (변경 감지용) */
    const [initialChecked, setInitialChecked] = useState(new Set());

    const fetchTypes = async () => {
        try {
            const res = await axios.get('/api/game-types', { headers });
            setGameTypes(res.data);
            const activeIds = new Set(res.data.filter(g => g.is_active).map(g => g.id));
            setCheckedIds(activeIds);
            setInitialChecked(new Set(activeIds));
            // 기본으로 모든 카테고리 열기
            const cats = {};
            res.data.forEach(g => { cats[g.category] = true; });
            setOpenCats(cats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTypes(); }, []);

    /* 변경 감지 */
    useEffect(() => {
        const changed =
            checkedIds.size !== initialChecked.size ||
            [...checkedIds].some(id => !initialChecked.has(id));
        setHasChanges(changed);
    }, [checkedIds, initialChecked]);

    /* 카테고리별 그룹 */
    const grouped = useMemo(() => {
        const filtered = search.trim()
            ? gameTypes.filter(g => g.name.includes(search) || g.description?.includes(search))
            : gameTypes;
        return filtered.reduce((acc, g) => {
            if (!acc[g.category]) acc[g.category] = [];
            acc[g.category].push(g);
            return acc;
        }, {});
    }, [gameTypes, search]);

    const categories = Object.keys(grouped);
    const totalChecked = checkedIds.size;
    const totalGames = gameTypes.length;

    /* 체크 토글 */
    const handleToggle = (id) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    /* 전체/카테고리 토글 */
    const handleToggleAll = (games, toCheck) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            games.forEach(g => toCheck ? next.add(g.id) : next.delete(g.id));
            return next;
        });
    };

    const handleSelectAll = () => setCheckedIds(new Set(gameTypes.map(g => g.id)));
    const handleDeselectAll = () => setCheckedIds(new Set());

    /* 저장 */
    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = gameTypes.map(g => ({ id: g.id, is_active: checkedIds.has(g.id) }));
            await axios.put('/api/game-types/bulk', { updates }, { headers });
            setInitialChecked(new Set(checkedIds));
            setHasChanges(false);
            showToast('✅ 변경사항이 저장되었습니다.');
        } catch (err) {
            showToast('❌ 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 2800);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--rvd-text-dim)' }}>
                불러오는 중...
            </div>
        );
    }

    return (
        <div className="animate-fade-up" style={{ position: 'relative' }}>
            {/* ── 페이지 헤더 ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <div className="page-title">게임 등록</div>
                    <div className="page-breadcrumb">// GAME_TYPES · 사용할 게임 종류를 선택하세요</div>
                </div>
            </div>

            {/* ── 컨트롤 바 ── */}
            <div className="rvd-card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {/* 전체 선택/해제 */}
                <button onClick={handleSelectAll} className="rvd-btn" style={{
                    background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)',
                    border: '1px solid rgba(0,212,255,0.25)', fontSize: 12, padding: '6px 14px',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <CheckSquare size={13} /> 전체 선택
                </button>
                <button onClick={handleDeselectAll} className="rvd-btn" style={{
                    background: 'rgba(255,255,255,0.04)', color: 'var(--rvd-text-dim)',
                    border: '1px solid var(--rvd-border2)', fontSize: 12, padding: '6px 14px',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}>
                    <Square size={13} /> 전체 해제
                </button>

                {/* 카운터 */}
                <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', marginLeft: 4 }}>
                    스코어{' '}
                    <span style={{ color: 'var(--rvd-cyan)', fontWeight: 700 }}>{totalChecked}</span>
                    {' '}/ {totalGames}
                </div>

                {/* 검색 */}
                <div style={{
                    flex: 1, marginLeft: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--rvd-border2)',
                    borderRadius: 7, padding: '5px 12px', maxWidth: 280,
                }}>
                    <Search size={13} style={{ color: 'var(--rvd-text-dim)', flexShrink: 0 }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="게임 검색..."
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            color: '#fff', fontSize: 13, width: '100%',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    />
                </div>

                {/* 저장 버튼 */}
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="rvd-btn rvd-btn-cyan"
                    style={{
                        marginLeft: 'auto', padding: '7px 20px', fontSize: 13,
                        opacity: (!hasChanges && !saving) ? 0.45 : 1,
                        cursor: (!hasChanges && !saving) ? 'default' : 'pointer',
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    <Save size={13} />
                    {saving ? '저장 중...' : `변경사항 저장${hasChanges ? ` (${totalChecked}개)` : ''}`}
                    {hasChanges && !saving && (
                        <span style={{
                            position: 'absolute', top: 3, right: 3,
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--rvd-yellow)',
                        }} className="animate-pulse-dot" />
                    )}
                </button>
            </div>

            {/* ── 테이블 헤더 ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 1fr 100px 80px',
                padding: '8px 20px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--rvd-text-dim)',
                borderBottom: '1px solid var(--rvd-border)',
                marginBottom: 4,
            }}>
                <span>게임 분류</span>
                <span>게임 이름</span>
                <span>게임 내용</span>
                <span style={{ textAlign: 'center' }}>게임 설정</span>
                <span style={{ textAlign: 'center' }}>사용 여부</span>
            </div>

            {/* ── 카테고리 섹션들 ── */}
            <div className="rvd-card" style={{ overflow: 'hidden', padding: 0 }}>
                {categories.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--rvd-text-dim)' }}>
                        <Gamepad2 size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                        <div>검색 결과가 없습니다.</div>
                    </div>
                ) : (
                    categories.map((cat, idx) => (
                        <div key={cat} style={{ borderBottom: idx < categories.length - 1 ? '1px solid var(--rvd-border)' : 'none' }}>
                            <CategorySection
                                category={cat}
                                games={grouped[cat]}
                                checkedIds={checkedIds}
                                onToggle={handleToggle}
                                onToggleAll={handleToggleAll}
                                isOpen={openCats[cat] !== false}
                                onOpenToggle={() => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                navigate={navigate}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* ── 하단 요약 ── */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                {categories.map(cat => {
                    const cs = CATEGORY_STYLE[cat] || CATEGORY_STYLE['퀴즈·경쟁'];
                    const catGames = grouped[cat] || [];
                    const catChecked = catGames.filter(g => checkedIds.has(g.id)).length;
                    return (
                        <div key={cat} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: cs.bg, border: `1px solid ${cs.border}`,
                            borderRadius: 6, padding: '4px 12px', fontSize: 12,
                        }}>
                            <span style={{ color: cs.color, fontWeight: 600 }}>{cat}</span>
                            <span style={{ color: 'var(--rvd-text-dim)' }}>{catChecked}/{catGames.length}</span>
                        </div>
                    );
                })}
            </div>

            {/* ── Toast 알림 ── */}
            {toastMsg && (
                <div style={{
                    position: 'fixed', bottom: 28, right: 28, zIndex: 999,
                    background: 'var(--rvd-surface2)', border: '1px solid var(--rvd-border2)',
                    borderRadius: 9, padding: '12px 20px', fontSize: 13, fontWeight: 500,
                    color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    animation: 'fade-up 0.25s ease-out',
                }}>
                    {toastMsg}
                </div>
            )}

            {/* ── 행 호버 스타일 ── */}
            <style>{`
                .game-type-row td { height: 46px; border-bottom: 1px solid var(--rvd-border); }
                .game-type-row:hover td { background: rgba(255,255,255,0.025); }
                .game-type-row:last-child td { border-bottom: none; }
            `}</style>
        </div>
    );
}
