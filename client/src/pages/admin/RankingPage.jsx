import React from 'react';
import { Trophy } from 'lucide-react';

export default function RankingPage() {
    return (
        <div className="animate-fade-up">
            <div style={{ marginBottom: 24 }}>
                <div className="page-title">랭킹 관리</div>
                <div className="page-breadcrumb">// RANKING_MANAGEMENT · 순위 현황</div>
            </div>
            <div className="rvd-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{
                    width: 56, height: 56,
                    background: 'var(--rvd-yellow-dim)',
                    border: '1px solid rgba(255,215,0,0.2)',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <Trophy size={24} style={{ color: 'var(--rvd-yellow)' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    랭킹 관리 기능 준비 중
                </div>
                <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)', lineHeight: 1.6 }}>
                    게임별 랭킹, 명예의 전당, 포인트 집계 등<br />
                    순차적으로 추가할 예정입니다.
                </div>
            </div>
        </div>
    );
}
