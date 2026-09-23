import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function AdminRegister() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            return setError('비밀번호가 일치하지 않습니다.');
        }
        setLoading(true);
        try {
            await axios.post('/api/auth/register', { name, email, password });
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
            navigate('/admin/login');
        } catch (err) {
            setError(err.response?.data?.message || '회원가입에 실패했습니다.');
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
            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `
                    linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
            }} />
            <div style={{
                position: 'absolute', top: '15%', right: '25%',
                width: 280, height: 280,
                background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div className="animate-fade-up" style={{
                width: '100%', maxWidth: 420,
                background: 'var(--rvd-surface)',
                border: '1px solid var(--rvd-border2)',
                borderRadius: 14,
                padding: '36px 32px',
                position: 'relative',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--rvd-cyan), transparent)',
                    borderRadius: '14px 14px 0 0'
                }} />

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 46, height: 46,
                        background: 'linear-gradient(135deg, var(--rvd-cyan), #004466)',
                        borderRadius: 10,
                        fontFamily: 'Orbitron, sans-serif', fontSize: 13, fontWeight: 900, color: '#fff',
                        marginBottom: 12,
                        boxShadow: '0 6px 20px var(--rvd-cyan-glow)'
                    }}>RVD</div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', marginBottom: 4 }}>
                        RVD ADMIN
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)' }}>관리자 계정 생성</div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255,68,68,0.1)',
                        border: '1px solid rgba(255,68,68,0.3)',
                        borderRadius: 7, padding: '10px 14px',
                        fontSize: 13, color: 'var(--rvd-red)', marginBottom: 16
                    }}>{error}</div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { label: '이름 / 호스트명', type: 'text', value: name, onChange: setName, placeholder: '홍길동' },
                        { label: '이메일', type: 'email', value: email, onChange: setEmail, placeholder: 'admin@example.com' },
                        { label: '비밀번호', type: 'password', value: password, onChange: setPassword, placeholder: '8자 이상 입력' },
                        { label: '비밀번호 확인', type: 'password', value: confirmPassword, onChange: setConfirmPassword, placeholder: '비밀번호를 다시 입력' },
                    ].map(({ label, type, value, onChange, placeholder }) => (
                        <div key={label}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--rvd-text-dim)', letterSpacing: '0.06em', marginBottom: 5 }}>
                                {label}
                            </label>
                            <input
                                type={type}
                                className="rvd-input"
                                value={value}
                                onChange={e => onChange(e.target.value)}
                                placeholder={placeholder}
                                required
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        className="rvd-btn rvd-btn-cyan"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '11px 0', marginTop: 4, fontSize: 14 }}
                    >
                        {loading ? '처리 중...' : '회원가입'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--rvd-text-dim)' }}>
                    이미 계정이 있으신가요?{' '}
                    <Link to="/admin/login" style={{ color: 'var(--rvd-cyan)', textDecoration: 'none', fontWeight: 500 }}>
                        로그인
                    </Link>
                </div>
            </div>
        </div>
    );
}
