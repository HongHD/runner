import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function StatsPage() {
    return (
        <div className="animate-fade-up">
            <div style={{ marginBottom: 24 }}>
                <div className="page-title">통계</div>
                <div className="page-breadcrumb">// STATISTICS · 종합 통계 리포트</div>
            </div>
            <div className="rvd-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{
                    width: 56, height: 56,
                    background: 'var(--rvd-green-dim)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <BarChart3 size={24} style={{ color: 'var(--rvd-green)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    통계 기능 준비 중
                </div>
                <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', lineHeight: 1.6 }}>
                    게임별 참가율, 정답률, 회차별 비교 등<br />
                    상세 통계 대시보드를 순차적으로 추가할 예정입니다.
                </div>
            </div>
        </div>
    );
}
