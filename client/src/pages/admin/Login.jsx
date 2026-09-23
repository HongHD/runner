import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth, token } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (token) navigate('/admin/dashboard');
    }, [token, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            setAuth(res.data.admin, res.data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || '로그인에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--rvd-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decorative grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `
                    linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
            }} />
            {/* Glow orbs */}
            <div style={{
                position: 'absolute', top: '20%', left: '30%',
                width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '20%', right: '30%',
                width: 250, height: 250,
                background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div className="animate-fade-up" style={{
                width: '100%', maxWidth: 400,
                background: 'var(--rvd-surface)',
                border: '1px solid var(--rvd-border2)',
                borderRadius: 14,
                padding: '36px 32px',
                position: 'relative',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}>
                {/* Top accent line */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--rvd-cyan), transparent)',
                    borderRadius: '14px 14px 0 0'
                }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 52, height: 52,
                        background: 'linear-gradient(135deg, var(--rvd-cyan), #004466)',
                        borderRadius: 12,
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: 16, fontWeight: 900, color: '#fff',
                        marginBottom: 14,
                        boxShadow: '0 8px 24px var(--rvd-cyan-glow)'
                    }}>RVD</div>
                    <div style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: 18, fontWeight: 700, color: '#fff',
                        letterSpacing: '0.12em', marginBottom: 4
                    }}>RVD ADMIN</div>
                    <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)' }}>
                        관리자 로그인
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255,68,68,0.1)',
                        border: '1px solid rgba(255,68,68,0.3)',
                        borderRadius: 7, padding: '10px 14px',
                        fontSize: 13, color: 'var(--rvd-red)',
                        marginBottom: 16
                    }}>{error}</div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--rvd-text-dim)', letterSpacing: '0.06em', marginBottom: 6 }}>
                            이메일
                        </label>
                        <input
                            type="email"
                            className="rvd-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--rvd-text-dim)', letterSpacing: '0.06em', marginBottom: 6 }}>
                            비밀번호
                        </label>
                        <input
                            type="password"
                            className="rvd-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="rvd-btn rvd-btn-cyan"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '11px 0', marginTop: 4, fontSize: 14 }}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--rvd-text-dim)' }}>
                    계정이 없으신가요?{' '}
                    <Link to="/admin/register" style={{ color: 'var(--rvd-cyan)', textDecoration: 'none', fontWeight: 500 }}>
                        회원가입
                    </Link>
                </div>
            </div>
        </div>
    );
}
