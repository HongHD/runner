import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import {
    LayoutDashboard, Gamepad2, Users, Trophy, BarChart3,
    Settings, FileText, Plus, UserPlus, Award, FileOutput,
    LogOut, Wifi, LayoutGrid, QrCode, X, Copy, Check
} from 'lucide-react';

/* ── 참여 QR 코드 팝업 ── */
function JoinQrModal({ pinCode, onClose }) {
    const [copied, setCopied] = useState(false);
    const [origin, setOrigin] = useState(window.location.origin);
    // 현재 접속 주소(origin) + PIN 조합 → 스캔 시 ID 입력 화면으로 바로 이동
    const joinUrl = `${origin}/play?pin=${pinCode}`;

    // localhost로 접속 중이면 휴대폰에서 열 수 없으므로 PC의 내부 IP로 교체
    useEffect(() => {
        const { hostname, protocol, port } = window.location;
        if (!['localhost', '127.0.0.1'].includes(hostname)) return;
        axios.get('/api/network-ip')
            .then(({ data }) => {
                if (data?.ip) setOrigin(`${protocol}//${data.ip}${port ? `:${port}` : ''}`);
            })
            .catch(err => console.error('네트워크 IP 조회 실패:', err));
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--rvd-surface, #0d1117)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: 16,
                    boxShadow: '0 0 40px rgba(0,212,255,0.12), 0 24px 60px rgba(0,0,0,0.6)',
                    width: '100%', maxWidth: 420,
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
                        <span style={{ width: 3, height: 16, borderRadius: 2, background: 'var(--rvd-cyan, #00d4ff)', display: 'inline-block' }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>참여 QR 코드</span>
                    </div>
                    <button onClick={onClose} className="rvd-btn rvd-btn-ghost" style={{ padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>

                {/* 본문 */}
                <div style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                    {pinCode ? (
                        <>
                            <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
                                <QRCodeSVG value={joinUrl} size={260} level="M" />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--rvd-text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>PIN</div>
                                <span className="pin-display">{pinCode}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--rvd-text)', textAlign: 'center' }}>
                                휴대폰 카메라로 QR 코드를 스캔한 뒤<br />ID를 입력하고 접속하세요.
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--rvd-border)',
                                borderRadius: 8, padding: '8px 10px',
                            }}>
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--rvd-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {joinUrl}
                                </span>
                                <button onClick={handleCopy} className="rvd-btn rvd-btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }}>
                                    {copied ? <Check size={13} /> : <Copy size={13} />}
                                    {copied ? '복사됨' : '복사'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', padding: '40px 0' }}>
                            PIN 정보가 없습니다. 다시 로그인해주세요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const NAV_ITEMS = [
    { to: '/admin/dashboard', icon: LayoutGrid, label: '대시보드', badge: null, section: 'NAVIGATION' },
    { to: '/admin/games', icon: Gamepad2, label: '게임 관리', badge: null, section: 'NAVIGATION' },
    { to: '/admin/users', icon: Users, label: '사용자 관리', badge: null, section: 'NAVIGATION' },
    { to: '/admin/ranking', icon: Trophy, label: '랭킹 관리', badge: null, section: 'NAVIGATION' },
    { to: '/admin/stats', icon: BarChart3, label: '통계', badge: 'NEW', section: 'NAVIGATION' },
    { to: '/admin/settings', icon: Settings, label: '설정', badge: null, section: 'SYSTEM' },
    { to: '/admin/log', icon: FileText, label: '로그', badge: null, section: 'SYSTEM' },
];

const QUICK_ACTIONS = [
    { to: '/admin/game-types', icon: Plus, label: '게임 등록' },
    { to: '/admin/users/add', icon: UserPlus, label: '사용자 추가' },
    { to: '/admin/ranking', icon: Award, label: '랭킹 생성' },
    { to: '/admin/stats', icon: FileOutput, label: '리포트 출력' },
];

export default function AdminLayout() {
    const { admin, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [showQr, setShowQr] = useState(false);

    useEffect(() => {
        if (!token) navigate('/admin/login');
    }, [token, navigate]);

    // 관리자 소켓 연결 — PIN으로 방 등록, 이후 참가자 실시간 알림 수신
    const socketRef = useRef(null);
    const refreshIntervalRef = useRef(null);
    useEffect(() => {
        if (!admin?.pinCode) return;

        const socket = io();
        socketRef.current = socket;
        window._adminSocket = socket; // Dashboard에서 공유 사용
        window._adminParticipantsCache = window._adminParticipantsCache || [];

        socket.on('connect', () => {
            console.log('[AdminLayout] 소켓 연결됨:', socket.id);
            socket.emit('admin_join', {
                pinCode: admin.pinCode,
                adminId: admin.id,
            });
        });

        // ★ 핵심 수정: online_participants 이벤트를 AdminLayout에서 즉시 캐싱
        //   Dashboard가 나중에 마운트되어도 캐시된 값을 즉시 사용 가능
        socket.on('online_participants', (data) => {
            window._adminParticipantsCache = data.participants || [];
            // 전역 커스텀 이벤트로 Dashboard에게 알림
            window.dispatchEvent(new CustomEvent('admin_participants_update', {
                detail: { participants: data.participants || [] }
            }));
        });

        socket.on('participant_update', (data) => {
            window.dispatchEvent(new CustomEvent('admin_participant_event', { detail: data }));
        });

        // 3초마다 목록 갱신 요청 (소켓 재연결 후에도 목록 유지)
        refreshIntervalRef.current = setInterval(() => {
            if (socket.connected) {
                socket.emit('request_online_participants');
            }
        }, 3000);

        return () => {
            clearInterval(refreshIntervalRef.current);
            socket.disconnect();
            window._adminSocket = null;
        };
    }, [admin?.pinCode]);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const navSections = ['NAVIGATION', 'SYSTEM', 'QUICK ACTIONS'];

    const renderNavSection = (section) => {
        const items = NAV_ITEMS.filter(i => i.section === section);
        return (
            <div key={section}>
                <div className="sidebar-section-label">{section}</div>
                {items.map(({ to, icon: Icon, label, badge }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar-item${isActive ? ' active' : ''}`
                        }
                    >
                        <Icon size={15} strokeWidth={1.8} />
                        <span>{label}</span>
                        {badge && (
                            <span className={`sidebar-badge ${badge === 'NEW' ? 'new' : ''}`}>
                                {badge}
                            </span>
                        )}
                    </NavLink>
                ))}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* ===== SIDEBAR ===== */}
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">RVD</div>
                    <div>
                        <div className="sidebar-logo-text">RVD ADMIN</div>
                        <div className="sidebar-logo-sub">관리 콘솔</div>
                    </div>
                </div>

                {/* Navigation */}
                {renderNavSection('NAVIGATION')}
                <div className="sidebar-divider" />
                {renderNavSection('SYSTEM')}
                <div className="sidebar-divider" />

                {/* Quick Actions */}
                <div className="sidebar-section-label">QUICK ACTIONS</div>
                {QUICK_ACTIONS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to + label}
                        to={to}
                        className="sidebar-item"
                        style={{ fontSize: '12px', opacity: 0.75 }}
                    >
                        <Icon size={13} strokeWidth={1.8} />
                        <span>{label}</span>
                    </NavLink>
                ))}
                <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    className="sidebar-item"
                    style={{ fontSize: '12px', opacity: 0.75, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                >
                    <QrCode size={13} strokeWidth={1.8} />
                    <span>참여 QR 코드</span>
                </button>

                {/* User Info */}
                <div className="sidebar-user">
                    <div
                        style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--rvd-cyan), #004466)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
                        }}
                    >
                        {(admin?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {admin?.name || '관리자'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--rvd-text-dim)' }}>Game Admin</div>
                    </div>
                    <div
                        style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rvd-green)', flexShrink: 0 }}
                        className="animate-pulse-dot"
                    />
                </div>
            </aside>

            {/* ===== HEADER ===== */}
            <header className="admin-header">
                <div className="sys-status">
                    <div className="sys-status-dot" />
                    SYSTEM ONLINE
                    <span style={{ color: 'var(--rvd-text-dim)', fontWeight: 400, letterSpacing: '0.04em' }}>
                        &nbsp;· v2.4.1
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* PIN */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: 'var(--rvd-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1 }}>
                            PIN
                        </span>
                        <span className="pin-display">
                            {admin?.pinCode || '------'}
                        </span>
                    </div>

                    {/* Logout */}
                    <button onClick={handleLogout} className="rvd-btn rvd-btn-ghost" style={{ fontSize: 12 }}>
                        <LogOut size={13} />
                        로그아웃
                    </button>
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main className="admin-main" style={{ flex: 1 }}>
                <Outlet />
            </main>

            {showQr && <JoinQrModal pinCode={admin?.pinCode} onClose={() => setShowQr(false)} />}
        </div>
    );
}
