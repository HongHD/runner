import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';
import {
    Gamepad2, Users, Activity, Wifi,
    Plus, ChevronRight, RefreshCw, LogOut, X, UserX
} from 'lucide-react';

/* ── 참가자 팝업 모달 ── */
function ParticipantModal({ title, participants, onClose, onForceLogout }) {
    const formatTime = (d) => d ? new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
                animation: 'fadeIn 0.15s ease',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--rvd-surface, #0d1117)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: 16,
                    boxShadow: '0 0 40px rgba(0,212,255,0.12), 0 24px 60px rgba(0,0,0,0.6)',
                    width: '100%', maxWidth: 640,
                    maxHeight: '80vh',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(0,212,255,0.04)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            width: 3, height: 16, borderRadius: 2,
                            background: 'var(--rvd-cyan, #00d4ff)',
                            display: 'inline-block'
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</span>
                        <span style={{
                            background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)',
                            borderRadius: 20, padding: '2px 10px',
                            fontSize: 12, fontWeight: 700, color: 'var(--rvd-cyan, #00d4ff)',
                        }}>
                            {participants.length}명
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, width: 30, height: 30,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--rvd-text-dim, #6b7280)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--rvd-text-dim, #6b7280)'; }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* 목록 */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {participants.length === 0 ? (
                        <div style={{
                            padding: 48, textAlign: 'center',
                            color: 'var(--rvd-text-dim, #6b7280)', fontSize: 13,
                        }}>
                            현재 PIN으로 접속한 사용자가 없습니다.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    {['#', '닉네임', '참여 게임', '접속 시각', '강퇴'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 16px', textAlign: h === '강퇴' ? 'center' : 'left',
                                            fontSize: 11, fontWeight: 600, color: 'var(--rvd-text-dim, #6b7280)',
                                            textTransform: 'uppercase', letterSpacing: '0.06em',
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p, i) => (
                                    <tr
                                        key={p.socketId || p.id || i}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--rvd-text-dim, #6b7280)', fontFamily: 'Orbitron, monospace' }}>
                                            #{String(p.id || i + 1).padStart(4, '0')}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, var(--rvd-cyan, #00d4ff), #004466)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                                                }}>
                                                    {(p.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{p.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--rvd-text-dim, #6b7280)' }}>
                                            {p.gameName || '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--rvd-text-dim, #6b7280)', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatTime(p.joinedAt)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => onForceLogout(p)}
                                                title="강제 로그아웃"
                                                style={{
                                                    background: 'rgba(255,60,60,0.1)',
                                                    border: '1px solid rgba(255,60,60,0.25)',
                                                    borderRadius: 7, padding: '5px 10px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    color: '#ff5555', fontSize: 11, fontWeight: 600,
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.5)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.25)'; }}
                                            >
                                                <UserX size={12} />
                                                강퇴
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 하단 */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'flex-end',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: '7px 16px',
                            color: 'var(--rvd-text-dim, #6b7280)', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--rvd-text-dim, #6b7280)'}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── 통계 카드 ── */
function StatCard({ label, value, sub, subValue, colorClass, icon: Icon, onClick, clickable }) {
    return (
        <div
            className={`stat-card ${colorClass} animate-count-up`}
            onClick={onClick}
            style={clickable ? { cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' } : undefined}
            onMouseEnter={clickable ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; } : undefined}
            onMouseLeave={clickable ? e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; } : undefined}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--rvd-text-dim)' }}>
                    {label}
                </div>
                <Icon size={14} style={{ color: 'var(--rvd-text-dim)', opacity: 0.6 }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: clickable ? 'var(--rvd-cyan, #00d4ff)' : '#fff', lineHeight: 1 }}>
                {value ?? '—'}
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--rvd-text-dim)' }}>
                    {sub}
                    {clickable && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--rvd-cyan, #00d4ff)', opacity: 0.7 }}>▶ 클릭하여 목록 보기</span>}
                </span>
                {subValue != null && (
                    <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: colorClass === 'cyan' ? 'var(--rvd-cyan)'
                            : colorClass === 'yellow' ? 'var(--rvd-yellow)'
                                : colorClass === 'green' ? 'var(--rvd-green)'
                                    : 'var(--rvd-orange)'
                    }}>
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── 상태 배지 ── */
function StatusBadge({ status }) {
    const map = {
        active: { cls: 'active', label: '진행 중' },
        waiting: { cls: 'waiting', label: '대기 중' },
        standby: { cls: 'standby', label: '준비 완료' },
        inactive: { cls: 'inactive', label: '종료' },
        running: { cls: 'running', label: '게임 중' },
    };
    const s = map[status] || map.inactive;
    return (
        <span className={`badge ${s.cls}`}>
            <span className="badge-dot" style={{
                background: s.cls === 'active' ? 'var(--rvd-cyan)'
                    : s.cls === 'waiting' ? 'var(--rvd-yellow)'
                        : s.cls === 'standby' ? 'var(--rvd-green)'
                            : s.cls === 'running' ? 'var(--rvd-orange)'
                                : 'var(--rvd-text-dim)'
            }} />
            {s.label}
        </span>
    );
}

/* ── 메인 대시보드 ── */
export default function Dashboard() {
    const { token } = useAuthStore();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [games, setGames] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [activeGameTypes, setActiveGameTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // 팝업 모달 상태
    const [modal, setModal] = useState(null); // null | 'total' | 'online'

    const headers = { Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
        try {
            const [gRes, sRes, gtRes] = await Promise.all([
                axios.get('/api/games', { headers }),
                axios.get('/api/games/admin/stats', { headers }),
                axios.get('/api/game-types', { headers }),
            ]);
            setGames(gRes.data || []);
            setStats(sRes.data);
            setActiveGameTypes((gtRes.data || []).filter(g => g.is_active));
            setLastUpdate(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [token]);

    // ─── 실시간 참가자 업데이트 ─────────────────────────────
    useEffect(() => {
        // 1. 캐시된 참가자 목록 즉시 표시 (AdminLayout이 이미 받아놓은 데이터)
        if (window._adminParticipantsCache && window._adminParticipantsCache.length > 0) {
            setParticipants(window._adminParticipantsCache);
        }

        // 2. AdminLayout이 online_participants 이벤트를 받을 때마다 갱신
        const onParticipantsList = (e) => {
            setParticipants(e.detail.participants || []);
        };

        // 3. 개별 참가자 입장/퇴장 이벤트 처리
        const onParticipantEvent = (e) => {
            const data = e.detail;
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) {
                        return prev.map(p => p.id === data.participant.id
                            ? { ...p, socketId: data.participant.socketId }
                            : p);
                    }
                    return [data.participant, ...prev].slice(0, 200);
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p =>
                    p.id === data.participant.id
                        ? { ...p, socketId: data.participant.socketId }
                        : p
                ));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
            }
        };

        window.addEventListener('admin_participants_update', onParticipantsList);
        window.addEventListener('admin_participant_event', onParticipantEvent);

        return () => {
            window.removeEventListener('admin_participants_update', onParticipantsList);
            window.removeEventListener('admin_participant_event', onParticipantEvent);
        };
    }, []);

    // 강제 로그아웃
    const handleForceLogout = (participant) => {
        const socket = window._adminSocket;
        if (!socket || !socket.connected) return;
        if (!window.confirm(`'${participant.name}' 님을 강제 로그아웃 하시겠습니까?`)) return;

        socket.emit('force_logout', {
            targetSocketId: participant.socketId,
            pinCode: participant.pinCode,
        });
    };

    const formatTime = (d) => new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d) => new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });

    // 모달 데이터
    const modalTitle = modal === 'total' ? '총 사용자 목록' : '현재 온라인 접속자';
    const modalData = participants; // 두 카드 모두 현재 실시간 데이터 기준

    return (
        <div className="animate-fade-up">
            {/* 모달 */}
            {modal && (
                <ParticipantModal
                    title={modalTitle}
                    participants={modalData}
                    onClose={() => setModal(null)}
                    onForceLogout={(p) => {
                        handleForceLogout(p);
                    }}
                />
            )}

            {/* 페이지 헤더 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <div className="page-title">대시보드</div>
                    <div className="page-breadcrumb">// DASHBOARD · 실시간 현황 대시보드</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--rvd-text-dim)' }}>
                        마지막 업데이트 {formatTime(lastUpdate)}
                    </span>
                    <button onClick={fetchAll} className="rvd-btn rvd-btn-ghost" style={{ padding: '6px 10px' }}>
                        <RefreshCw size={13} />
                    </button>
                    <button onClick={() => navigate('/admin/game/create')} className="rvd-btn rvd-btn-cyan">
                        <Plus size={14} />
                        새 게임 등록
                    </button>
                </div>
            </div>

            {/* 통계 카드 4개 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard
                    label="총 게임 수"
                    value={stats?.totalGames ?? games.length}
                    sub="이번 주 신규"
                    subValue={stats?.weeklyGames != null ? `+${stats.weeklyGames}` : null}
                    colorClass="cyan"
                    icon={Gamepad2}
                />
                <StatCard
                    label="총 사용자 수"
                    value={participants.length}
                    sub="PIN 현재 접속 기준"
                    subValue={null}
                    colorClass="yellow"
                    icon={Users}
                    clickable
                    onClick={() => setModal('total')}
                />
                <StatCard
                    label="지금 진행 중"
                    value={stats?.activeSessions}
                    sub="총 세션"
                    subValue={stats?.totalSessions != null ? `${stats.totalSessions}회` : null}
                    colorClass="green"
                    icon={Activity}
                />
                <StatCard
                    label="현재 온라인"
                    value={participants.length}
                    sub="PIN 접속자"
                    subValue={null}
                    colorClass="orange"
                    icon={Wifi}
                    clickable
                    onClick={() => setModal('online')}
                />
            </div>

            {/* 하단 2단 패널 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* 게임 목록 */}
                <div className="rvd-card">
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderBottom: '1px solid var(--rvd-border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 3, height: 14, background: 'var(--rvd-cyan)', borderRadius: 2, display: 'inline-block' }} />
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>게임 목록</span>
                        </div>
                        <button
                            onClick={() => navigate('/admin/game/create')}
                            className="rvd-btn"
                            style={{ fontSize: 11, padding: '4px 10px', background: 'var(--rvd-cyan-dim)', color: 'var(--rvd-cyan)', border: '1px solid rgba(0,212,255,0.2)' }}
                        >
                            <Plus size={11} /> 새 게임 등록
                        </button>
                    </div>

                    <table className="rvd-table">
                        <thead>
                            <tr>
                                <th>게임명</th>
                                <th>게임 ID</th>
                                <th>인원</th>
                                <th>시간</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--rvd-text-dim)' }}>불러오는 중...</td></tr>
                            ) : games.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--rvd-text-dim)' }}>등록된 게임이 없습니다.</td></tr>
                            ) : (
                                games.slice(0, 6).map(game => (
                                    <tr key={game.id} onClick={() => navigate(`/admin/game/${game.id}/edit`)}>
                                        <td style={{ fontWeight: 600, color: '#fff' }}>{game.title}</td>
                                        <td style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, color: 'var(--rvd-text-dim)', letterSpacing: '0.05em' }}>
                                            #{String(game.id).padStart(4, '0')}
                                        </td>
                                        <td>{game.maxParticipants ?? '—'}명</td>
                                        <td>{game.created_at ? formatDate(game.created_at) : '—'}</td>
                                        <td><StatusBadge status={game.status || 'inactive'} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {games.length > 6 && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--rvd-border)', textAlign: 'right' }}>
                            <button onClick={() => navigate('/admin/dashboard')}
                                style={{ background: 'none', border: 'none', color: 'var(--rvd-cyan)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                전체 보기 <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* 접속자 목록 (PIN 전용) */}
                <div className="rvd-card">
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderBottom: '1px solid var(--rvd-border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 3, height: 14, background: 'var(--rvd-yellow)', borderRadius: 2, display: 'inline-block' }} />
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>접속자 목록</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--rvd-yellow)',
                                background: 'rgba(255,196,0,0.1)', border: '1px solid rgba(255,196,0,0.2)',
                                padding: '1px 6px', borderRadius: 4
                            }}>PIN 전용</span>
                        </div>
                        <button
                            onClick={() => setModal('online')}
                            style={{ background: 'none', border: 'none', color: 'var(--rvd-cyan)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            전체 보기 <ChevronRight size={12} />
                        </button>
                    </div>

                    <table className="rvd-table">
                        <thead>
                            <tr>
                                <th>이름</th>
                                <th>ID</th>
                                <th>참여 게임</th>
                                <th>시간</th>
                                <th>상태</th>
                                <th style={{ textAlign: 'center' }}>강퇴</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--rvd-text-dim)' }}>
                                        현재 PIN으로 접속한 사용자가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                participants.slice(0, 6).map((p, i) => (
                                    <tr key={p.socketId || p.id || i}>
                                        <td style={{ fontWeight: 600, color: '#fff' }}>{p.name}</td>
                                        <td style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, color: 'var(--rvd-text-dim)', letterSpacing: '0.04em' }}>
                                            #{String(p.id || 0).padStart(4, '0')}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--rvd-text-dim)' }}>{p.gameName || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{p.joinedAt ? formatTime(p.joinedAt) : '—'}</td>
                                        <td><StatusBadge status={p.status || 'active'} /></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleForceLogout(p); }}
                                                title="강제 로그아웃"
                                                style={{
                                                    background: 'rgba(255,60,60,0.12)',
                                                    border: '1px solid rgba(255,60,60,0.3)',
                                                    borderRadius: 6, padding: '3px 8px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    color: '#ff5555', fontSize: 11, fontWeight: 600,
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,60,60,0.25)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,60,60,0.12)'}
                                            >
                                                <UserX size={11} />
                                                강퇴
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 3. 활성화된 게임 종류 ── */}
            <div className="admin-panel" style={{ marginTop: 24 }}>
                <div className="admin-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Gamepad2 size={16} className="text-rvd-cyan" />
                        활성화된 게임 종류
                    </div>
                </div>
                <div className="admin-panel-content" style={{ padding: '20px' }}>
                    {activeGameTypes.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--rvd-text-dim)', padding: 20 }}>
                            현재 활성화된 게임이 없습니다. [게임 등록]에서 게임을 활성화해주세요.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {activeGameTypes.map(g => {
                                const isQuiz = g.category === '퀴즈·경쟁';
                                const isVote = g.category === '투표·소통';
                                const color = isQuiz ? 'var(--rvd-cyan)' : isVote ? 'var(--rvd-yellow)' : 'var(--rvd-green)';
                                const bg = isQuiz ? 'var(--rvd-cyan-dim)' : isVote ? 'var(--rvd-yellow-dim)' : 'var(--rvd-green-dim)';
                                return (
                                    <div key={g.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: bg, border: `1px solid ${color}40`,
                                        borderRadius: 8, padding: '8px 14px',
                                    }}>
                                        <span style={{ fontSize: 16 }}>{g.category_icon}</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                                                {g.name}
                                                {g.badge && (
                                                    <span style={{ marginLeft: 6, fontSize: 9, color: color, background: `${color}20`, padding: '2px 4px', borderRadius: 4 }}>
                                                        {g.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--rvd-text-dim)', marginTop: 2 }}>{g.category}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
