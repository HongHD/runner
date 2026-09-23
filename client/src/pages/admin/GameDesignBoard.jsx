import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { Plus, Settings, Trash2, ArrowLeft, Play, FileQuestion } from 'lucide-react';

export default function GameDesignBoard() {
    const { type } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const apiHeaders = { Authorization: `Bearer ${token}` };

    const getTypeName = () => {
        if (type === 'ox') return 'OX퀴즈';
        if (type === 'multiple_choice') return '4지선다형';
        if (type === 'quiz') return '퀴즈';
        if (type === 'survey') return '설문';
        if (type === 'mole') return '두더지 게임';
        if (type === 'stopwatch') return '스탑워치';
        return type?.toUpperCase() || '';
    };

    const fetchGames = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/games?game_type=${type}`, { headers: apiHeaders });
            setGames(res.data);
        } catch (err) {
            console.error('게임 목록 조회 실패:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, [type]);

    const handleDelete = async (e, gameId) => {
        e.stopPropagation();
        if (!window.confirm('정말 삭제하시겠습니까? 연결된 질문과 옵션도 함께 삭제됩니다.')) return;
        setDeletingId(gameId);
        try {
            await axios.delete(`/api/games/${gameId}`, { headers: apiHeaders });
            setGames(prev => prev.filter(g => g.id !== gameId));
        } catch (error) {
            console.error('삭제 실패:', error);
            alert('삭제에 실패했습니다.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateNew = async () => {
        try {
            const res = await axios.post('/api/games', {
                title: `새 ${getTypeName()} (${new Date().toLocaleDateString()})`,
                description: '',
                game_type: type
            }, { headers: apiHeaders });
            navigate(`/admin/game/${res.data.id}/edit`);
        } catch (error) {
            alert('게임 생성 중 오류가 발생했습니다.');
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'active') return <span className="badge active"><span className="badge-dot" style={{ background: 'var(--rvd-cyan)' }} />활성</span>;
        if (status === 'finished') return <span className="badge inactive">종료</span>;
        return <span className="badge waiting"><span className="badge-dot" style={{ background: 'var(--rvd-yellow)' }} />준비</span>;
    };

    return (
        <div className="animate-fade-up" style={{ padding: '0' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                        onClick={() => navigate('/admin/game-types')}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--rvd-border2)',
                            borderRadius: 8,
                            padding: '7px 10px',
                            color: 'var(--rvd-text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--rvd-cyan)'; e.currentTarget.style.borderColor = 'var(--rvd-cyan)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--rvd-text-dim)'; e.currentTarget.style.borderColor = 'var(--rvd-border2)'; }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="page-breadcrumb">게임 관리 / {getTypeName()}</div>
                        <h1 className="page-title" style={{ marginTop: 2 }}>게임 설계 관리</h1>
                    </div>
                </div>
                <button onClick={handleCreateNew} className="rvd-btn rvd-btn-cyan">
                    <Plus size={15} />
                    새 게임 만들기
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="rvd-card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--rvd-text-dim)' }}>
                    <div style={{ fontSize: 13 }}>로딩 중...</div>
                </div>
            ) : games.length === 0 ? (
                <div className="rvd-card" style={{ padding: '80px 24px', textAlign: 'center' }}>
                    <FileQuestion size={48} style={{ color: 'var(--rvd-text-dim)', margin: '0 auto 16px' }} />
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>등록된 게임이 없습니다</div>
                    <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', marginBottom: 24 }}>
                        [새 게임 만들기] 버튼을 눌러 {getTypeName()} 게임 데이터를 설계해보세요.
                    </div>
                    <button onClick={handleCreateNew} className="rvd-btn rvd-btn-cyan">
                        <Plus size={14} />
                        새 게임 만들기
                    </button>
                </div>
            ) : (
                <div className="rvd-card" style={{ overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 160px 120px 130px',
                        padding: '10px 20px',
                        borderBottom: '1px solid var(--rvd-border)',
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rvd-text-dim)' }}>게임 제목</span>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rvd-text-dim)' }}>등록일자</span>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rvd-text-dim)', textAlign: 'center' }}>상태</span>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rvd-text-dim)', textAlign: 'right' }}>관리</span>
                    </div>

                    {/* Table Body */}
                    {games.map((game, idx) => (
                        <div
                            key={game.id}
                            onClick={() => navigate(`/admin/game/${game.id}/edit`)}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 160px 120px 130px',
                                padding: '14px 20px',
                                borderBottom: idx < games.length - 1 ? '1px solid var(--rvd-border)' : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                alignItems: 'center',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {/* Title */}
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{game.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {game.description || '설명 없음'}
                                </div>
                            </div>

                            {/* Date */}
                            <div style={{ fontSize: 12, color: 'var(--rvd-text-dim)' }}>
                                {new Date(game.created_at).toLocaleDateString('ko-KR')}
                            </div>

                            {/* Status */}
                            <div style={{ textAlign: 'center' }}>
                                {getStatusBadge(game.status)}
                            </div>

                            {/* Actions */}
                            <div
                                style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Play */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/game/${type}/${game.id}/play`); }}
                                    title="게임 시작"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--rvd-border2)',
                                        borderRadius: 6,
                                        padding: '5px 8px',
                                        color: 'var(--rvd-text-dim)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--rvd-green)'; e.currentTarget.style.borderColor = 'var(--rvd-green)'; e.currentTarget.style.background = 'var(--rvd-green-dim)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--rvd-text-dim)'; e.currentTarget.style.borderColor = 'var(--rvd-border2)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Play size={14} />
                                </button>

                                {/* Settings */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/game/${game.id}/edit`); }}
                                    title="설정"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--rvd-border2)',
                                        borderRadius: 6,
                                        padding: '5px 8px',
                                        color: 'var(--rvd-text-dim)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--rvd-cyan)'; e.currentTarget.style.borderColor = 'var(--rvd-cyan)'; e.currentTarget.style.background = 'var(--rvd-cyan-dim)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--rvd-text-dim)'; e.currentTarget.style.borderColor = 'var(--rvd-border2)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Settings size={14} />
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={(e) => handleDelete(e, game.id)}
                                    disabled={deletingId === game.id}
                                    title="삭제"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid var(--rvd-border2)',
                                        borderRadius: 6,
                                        padding: '5px 8px',
                                        color: deletingId === game.id ? 'var(--rvd-text-dim)' : 'var(--rvd-text-dim)',
                                        cursor: deletingId === game.id ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.15s',
                                        opacity: deletingId === game.id ? 0.5 : 1,
                                    }}
                                    onMouseEnter={e => { if (deletingId !== game.id) { e.currentTarget.style.color = 'var(--rvd-red)'; e.currentTarget.style.borderColor = 'var(--rvd-red)'; e.currentTarget.style.background = 'rgba(255,68,68,0.1)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--rvd-text-dim)'; e.currentTarget.style.borderColor = 'var(--rvd-border2)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            {!loading && games.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--rvd-text-dim)', textAlign: 'right' }}>
                    총 {games.length}개의 {getTypeName()} 게임
                </div>
            )}
        </div>
    );
}
