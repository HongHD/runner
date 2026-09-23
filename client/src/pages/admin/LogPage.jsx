import React from 'react';
import { FileText } from 'lucide-react';

export default function LogPage() {
    return (
        <div className="animate-fade-up">
            <div style={{ marginBottom: 24 }}>
                <div className="page-title">로그</div>
                <div className="page-breadcrumb">// SYSTEM_LOG · 접속 및 이벤트 로그</div>
            </div>
            <div className="rvd-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{
                    width: 56, height: 56,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--rvd-border2)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <FileText size={24} style={{ color: 'var(--rvd-text-dim)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    로그 기능 준비 중
                </div>
                <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', lineHeight: 1.6 }}>
                    관리자 접속 로그, 게임 이벤트 기록 등<br />
                    순차적으로 추가할 예정입니다.
                </div>
            </div>
        </div>
    );
}
