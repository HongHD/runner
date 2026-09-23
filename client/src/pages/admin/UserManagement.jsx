import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Shuffle, Plus, Minus, Check } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// ────────────────────────────────────────────────────────
// 팀 색상 팔레트 (최대 10팀)
// ────────────────────────────────────────────────────────
const TEAM_COLORS = [
    { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#f87171', label: 'rgba(239,68,68,0.8)' },   // 1 red
    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#60a5fa', label: 'rgba(59,130,246,0.8)' },  // 2 blue
    { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#4ade80', label: 'rgba(34,197,94,0.8)' },   // 3 green
    { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)', text: '#facc15', label: 'rgba(234,179,8,0.8)' },   // 4 yellow
    { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)', text: '#c084fc', label: 'rgba(168,85,247,0.8)' },  // 5 purple
    { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.4)', text: '#f472b6', label: 'rgba(236,72,153,0.8)' },  // 6 pink
    { bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.4)', text: '#2dd4bf', label: 'rgba(20,184,166,0.8)' },  // 7 teal
    { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', text: '#fb923c', label: 'rgba(249,115,22,0.8)' },  // 8 orange
    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.4)', text: '#818cf8', label: 'rgba(99,102,241,0.8)' },  // 9 indigo
    { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.4)', text: '#22d3ee', label: 'rgba(6,182,212,0.8)' },   // 10 cyan
];

function getTeamColor(teamNum) {
    const idx = (parseInt(teamNum, 10) - 1) % TEAM_COLORS.length;
    return TEAM_COLORS[Math.max(0, idx)];
}

// ────────────────────────────────────────────────────────
// Player Card (draggable)
// ────────────────────────────────────────────────────────
function PlayerCard({ participant, teamNum, onDragStart }) {
    const color = teamNum ? getTeamColor(teamNum) : null;
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('participantId', String(participant.id));
                onDragStart && onDragStart(participant);
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: color ? color.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${color ? color.border : 'rgba(255,255,255,0.08)'}`,
                cursor: 'grab',
                marginBottom: 6,
                userSelect: 'none',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
            <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: color ? color.label : 'rgba(0,212,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
                {(participant.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {participant.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--rvd-text-dim)' }}>
                    {participant.online ? '온라인' : '오프라인'}
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────
// Team Column (droppable)
// ────────────────────────────────────────────────────────
function TeamColumn({ teamNum, members, onDrop, onDragStart }) {
    const [over, setOver] = useState(false);
    const color = teamNum ? getTeamColor(teamNum) : null;

    return (
        <div
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => {
                e.preventDefault();
                setOver(false);
                const pid = Number(e.dataTransfer.getData('participantId'));
                onDrop(pid, teamNum);
            }}
            style={{
                flex: '1 1 180px',
                minWidth: 150,
                maxWidth: 240,
                background: over
                    ? (color ? color.bg : 'rgba(255,255,255,0.06)')
                    : 'rgba(255,255,255,0.02)',
                border: `1px solid ${over ? (color ? color.border : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
                padding: 14,
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* 헤더 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
                {teamNum ? (
                    <div style={{
                        fontSize: 12, fontWeight: 800, color: color.text,
                        background: color.bg, border: `1px solid ${color.border}`,
                        padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                    }}>
                        {teamNum}팀
                    </div>
                ) : (
                    <div style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--rvd-text-dim)',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '3px 10px', borderRadius: 20,
                    }}>
                        미배정
                    </div>
                )}
                <span style={{ fontSize: 11, color: 'var(--rvd-text-dim)', marginLeft: 'auto' }}>
                    {members.length}명
                </span>
            </div>

            {/* 참가자 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
                {members.map(p => (
                    <PlayerCard
                        key={p.id}
                        participant={p}
                        teamNum={teamNum}
                        onDragStart={onDragStart}
                    />
                ))}
                {members.length === 0 && (
                    <div style={{
                        padding: '20px 0', textAlign: 'center',
                        color: 'var(--rvd-text-dim)', fontSize: 11,
                        border: '1px dashed rgba(255,255,255,0.08)',
                        borderRadius: 8,
                    }}>
                        드래그해서 배정
                    </div>
                )}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────
// Main UserManagement component
// ────────────────────────────────────────────────────────
export default function UserManagement() {
    const { admin } = useAuthStore();
    const pinCode = admin?.pinCode;

    const [participants, setParticipants] = useState([]); // { id, name, socketId, team, online }
    const [teamCount, setTeamCount] = useState(2);
    const [saved, setSaved] = useState(false);

    // 로컬에서 팀을 수정 중인지 추적 (서버 주기 갱신이 덮어쓰는 것을 방지)
    const localTeamOverrideRef = useRef({}); // { [participantId]: team }

    // ── 소켓 연결 및 실시간 참가자 관리 ──────────────────
    useEffect(() => {
        // 1. AdminLayout이 캐시해 둔 목록 즉시 로드
        if (window._adminParticipantsCache && window._adminParticipantsCache.length > 0) {
            const list = window._adminParticipantsCache.map(p => ({
                id: p.id,
                name: p.name,
                socketId: p.socketId,
                // 로컬 오버라이드가 있으면 우선 적용
                team: localTeamOverrideRef.current[p.id] !== undefined
                    ? localTeamOverrideRef.current[p.id]
                    : (p.team || null),
                online: true,
            }));
            setParticipants(list);
        }

        // 2. 전체 목록 갱신 (주로 3초 주기 요청 응답)
        //    ★ 핵심 수정: 서버에서 온 목록으로 전체 교체하지 않고,
        //      로컬에서 수정한 팀 배정(localTeamOverrideRef)을 우선 보존한다.
        const onList = (e) => {
            const incoming = e.detail.participants || [];
            setParticipants(prev => {
                // 기존 id 세트
                const prevMap = new Map(prev.map(p => [p.id, p]));
                const result = incoming.map(p => {
                    const existing = prevMap.get(p.id);
                    // 로컬 오버라이드 → 기존 상태 team → 서버 team 순으로 우선순위 적용
                    const localOverride = localTeamOverrideRef.current[p.id];
                    const team = localOverride !== undefined
                        ? localOverride
                        : (existing ? existing.team : (p.team || null));
                    return {
                        id: p.id,
                        name: p.name,
                        socketId: p.socketId,
                        team,
                        online: true,
                    };
                });
                // 서버 목록에 없는 기존 참가자는 오프라인 처리
                const incomingIds = new Set(incoming.map(p => p.id));
                prev.forEach(p => {
                    if (!incomingIds.has(p.id)) {
                        result.push({ ...p, online: false, socketId: null });
                    }
                });
                return result;
            });
        };

        // 3. 개별 입장/퇴장
        const onEvent = (e) => {
            const data = e.detail;
            if (data.type === 'join') {
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === data.participant.id);
                    if (exists) {
                        return prev.map(p => p.id === data.participant.id
                            ? { ...p, socketId: data.participant.socketId, online: true }
                            : p);
                    }
                    const localOverride = localTeamOverrideRef.current[data.participant.id];
                    return [...prev, {
                        id: data.participant.id,
                        name: data.participant.name,
                        socketId: data.participant.socketId,
                        team: localOverride !== undefined ? localOverride : (data.participant.team || null),
                        online: true,
                    }];
                });
            } else if (data.type === 'reconnect') {
                setParticipants(prev => prev.map(p =>
                    p.id === data.participant.id
                        ? { ...p, socketId: data.participant.socketId, online: true }
                        : p
                ));
            } else if (data.type === 'leave') {
                setParticipants(prev => prev.map(p =>
                    p.socketId === data.socketId ? { ...p, online: false, socketId: null } : p
                ));
            }
        };

        const socket = window._adminSocket;
        if (socket) {
            socket.on('teams_updated', (data) => {
                if (data.assignments) {
                    // 서버에서 팀 배정 확정이 왔을 때 로컬 오버라이드도 동기화
                    data.assignments.forEach(a => {
                        localTeamOverrideRef.current[a.participantId] = a.team;
                    });
                    setParticipants(prev => prev.map(p => {
                        const match = data.assignments.find(a => a.participantId === p.id);
                        return match ? { ...p, team: match.team } : p;
                    }));
                }
            });
        }

        window.addEventListener('admin_participants_update', onList);
        window.addEventListener('admin_participant_event', onEvent);

        return () => {
            window.removeEventListener('admin_participants_update', onList);
            window.removeEventListener('admin_participant_event', onEvent);
            if (window._adminSocket) {
                window._adminSocket.off('teams_updated');
            }
        };
    }, [pinCode]);

    // ── 드래그 앤 드롭 ────────────────────────────────────
    const handleDrop = useCallback((participantId, targetTeam) => {
        // 로컬 오버라이드에도 기록하여 주기 갱신 때 덮어쓰이지 않게 보호
        localTeamOverrideRef.current[participantId] = targetTeam;
        setParticipants(prev =>
            prev.map(p => p.id === participantId ? { ...p, team: targetTeam } : p)
        );
    }, []);

    // ── 자동 팀 배정 ──────────────────────────────────────
    const handleAutoAssign = () => {
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        const updated = shuffled.map((p, i) => ({
            ...p,
            team: String((i % teamCount) + 1),
        }));
        // 로컬 오버라이드에도 반영하여 주기 갱신 때 덮어쓰이지 않게 보호
        updated.forEach(p => {
            localTeamOverrideRef.current[p.id] = p.team;
        });
        setParticipants(updated);
    };

    // ── 팀 배정 저장 & 브로드캐스트 ──────────────────────
    const handleSave = () => {
        const socket = window._adminSocket;
        if (!socket || !pinCode) return;

        const assignments = participants.map(p => ({
            participantId: p.id,
            team: p.team,
        }));

        socket.emit('admin_update_teams', { pinCode, assignments });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // ── 팀 초기화 ─────────────────────────────────────────
    const handleReset = () => {
        // 로컬 오버라이드도 모두 null로 초기화
        Object.keys(localTeamOverrideRef.current).forEach(id => {
            localTeamOverrideRef.current[id] = null;
        });
        setParticipants(prev => prev.map(p => ({ ...p, team: null })));
    };

    // ── 컬럼 데이터 생성 ──────────────────────────────────
    const unassigned = participants.filter(p => !p.team);
    const teamColumns = Array.from({ length: teamCount }, (_, i) => ({
        teamNum: String(i + 1),
        members: participants.filter(p => p.team === String(i + 1)),
    }));

    return (
        <div className="animate-fade-up" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── 헤더 ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div className="page-title">사용자 관리</div>
                    <div className="page-breadcrumb">// USER_MANAGEMENT · 팀 배정</div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* 팀 수 조절 */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '4px 8px',
                    }}>
                        <span style={{ fontSize: 12, color: 'var(--rvd-text-dim)', marginRight: 4 }}>팀 수</span>
                        <button onClick={() => setTeamCount(c => Math.max(1, c - 1))}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, borderRadius: 4 }}>
                            <Minus size={14} />
                        </button>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--rvd-cyan)', minWidth: 24, textAlign: 'center' }}>{teamCount}</span>
                        <button onClick={() => setTeamCount(c => Math.min(10, c + 1))}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, borderRadius: 4 }}>
                            <Plus size={14} />
                        </button>
                    </div>

                    <button onClick={handleAutoAssign}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                            color: '#c084fc', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}>
                        <Shuffle size={14} /> 자동 팀 배정
                    </button>

                    <button onClick={handleReset}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--rvd-text-dim)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        }}>
                        초기화
                    </button>

                    <button onClick={handleSave}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(0,212,255,0.15)',
                            border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(0,212,255,0.3)'}`,
                            color: saved ? '#4ade80' : 'var(--rvd-cyan)',
                            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}>
                        {saved ? <><Check size={14} /> 배정 완료!</> : '팀 배정 저장'}
                    </button>
                </div>
            </div>

            {/* ── 통계 바 ── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <StatPill label="총 참가자" value={participants.length} color="var(--rvd-cyan)" />
                <StatPill label="온라인" value={participants.filter(p => p.online).length} color="#4ade80" />
                <StatPill label="미배정" value={unassigned.length} color="#facc15" />
                <StatPill label="배정 완료" value={participants.length - unassigned.length} color="#c084fc" />
            </div>

            {/* ── 칸반 보드 ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* 미배정 컬럼 */}
                    <TeamColumn
                        teamNum={null}
                        members={unassigned}
                        onDrop={handleDrop}
                    />

                    {/* 팀 컬럼들 */}
                    {teamColumns.map(col => (
                        <TeamColumn
                            key={col.teamNum}
                            teamNum={col.teamNum}
                            members={col.members}
                            onDrop={handleDrop}
                        />
                    ))}
                </div>
            </div>

            {participants.length === 0 && (
                <div className="rvd-card" style={{ padding: 48, textAlign: 'center', marginTop: 24 }}>
                    <Users size={32} style={{ color: 'var(--rvd-cyan)', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                        아직 접속한 참가자가 없습니다
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--rvd-text-dim)' }}>
                        사용자가 PIN으로 접속하면 실시간으로 여기에 표시됩니다.
                    </div>
                </div>
            )}
        </div>
    );
}

function StatPill({ label, value, color }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '6px 14px',
        }}>
            <span style={{ fontSize: 11, color: 'var(--rvd-text-dim)' }}>{label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
        </div>
    );
}
