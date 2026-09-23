const Admin = require('../models/Admin');
const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const Participant = require('../models/Participant');
const Note = require('../models/Note');
const BoardPost = require('../models/BoardPost');
const Question = require('../models/Question');
const Option = require('../models/Option');
const { Op } = require('sequelize');

// 관리자 socket.id → admin 정보 맵 (실시간 온라인 추적용)
const adminSocketMap = new Map(); // socketId → { adminId, pinCode }
// PIN → 관리자 socketId 맵 (참가자 join 시 관리자에게 emit)
const pinToAdminSocket = new Map(); // pinCode → socketId
// PIN 참가자 맵 — PIN 입장한 사용자만 추적 (socketId → { nickname, pinCode, gameTitle, joinedAt })
const pinParticipantMap = new Map();
// 스피드 부저 세션 맵 (sessionId → { rankCounter, startTime })
const buzzerSessionMap = new Map();
// OX 퀴즈 답변 맵 (sessionId → Map{ participantId → [{ qIdx, answer }] })
const oxAnswerMap = new Map();
// OX 퀴즈 점수 맵 (sessionId → Map{ participantId → score })
const oxScoreMap = new Map();
// MC (4지선다) 맵
const mcAnswerMap = new Map();
const mcScoreMap = new Map();
const mcTimeMap = new Map();
const mcQuestionStartMap = new Map();
// Speed Piano 맵
const speedPianoSessionMap = new Map(); // sessionId → { level, currentNotes, startTime, participantScores }
const speedPianoScoreMap = new Map(); // sessionId → Map{ participantId → { correctCount, totalAttempts, speed, score } }

// Speed Tile 맵
const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'];
const getRandomSubarray = (arr, size) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
};
const speedTileSessionMap = new Map();
const speedTileScoreMap = new Map();

// 공감투표 맵 (sessionId → { posts: Map{ postId → { id, text, nickname, participantId, hearts: Set(participantId) } }, postCounter })
const empathyVoteMap = new Map();
// 워드클라우드 맵 (sessionId → Map{ word → count })
const wordCloudMap = new Map();
// 행운권 추첨 당첨자 이력 맵 (pinCode → [{ nickname }])
const luckyDrawMap = new Map();
// 사다리 게임 맵 (pinCode → { ladderCount, bars, assignments, prizes, results })
const ladderGameMap = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] 연결: ${socket.id}`);

        // ──────────────────────────────────────────────
        // 관리자 대시보드 접속
        // ──────────────────────────────────────────────
        socket.on('admin_join', async (data) => {
            const { pinCode, adminId, gameTitle, gameType, gameId } = data;
            socket.join(`admin_${pinCode}`);
            adminSocketMap.set(socket.id, { adminId, pinCode });
            pinToAdminSocket.set(pinCode, socket.id);
            console.log(`[Socket] 관리자(${adminId}) 입장, PIN: ${pinCode}`);

            // 재연결 시 이전 kick 타이머 취소
            if (global._adminKickTimers?.[pinCode]) {
                clearTimeout(global._adminKickTimers[pinCode]);
                delete global._adminKickTimers[pinCode];
            }

            try {
                if (gameId) {
                    // gameId 기반: waiting 세션만 닫고 새 waiting 세션 생성
                    // 만약 현재 진행 중인 active 세션이 다른 게임이라면 종료 처리
                    const existingActive = await GameSession.findOne({
                        where: { pin_code: pinCode, status: 'active' }
                    });

                    if (existingActive) {
                        if (existingActive.game_id !== parseInt(gameId)) {
                            console.log(`[Socket] 진행 중인 다른 게임 세션(${existingActive.game_id}) 강제 종료 후 새 게임(${gameId}) 준비`);
                            await existingActive.update({ status: 'finished', ended_at: new Date() });
                        } else {
                            console.log(`[Socket] 진행 중인 세션 유지: PIN=${pinCode}, sessionId=${existingActive.id}`);
                        }
                    }

                    // 기존 진행 중 세션이 없거나(있어도 위에서 종료됨), 혹은 같은 게임이면 waiting 세션 교체/생성
                    if (!existingActive || existingActive.game_id !== parseInt(gameId)) {
                        await GameSession.update(
                            { status: 'finished', ended_at: new Date() },
                            { where: { pin_code: pinCode, status: 'waiting' } }
                        );
                        await GameSession.create({ game_id: parseInt(gameId), pin_code: pinCode, status: 'waiting' });
                        console.log(`[Socket] 새 게임 세션 생성 완료: PIN=${pinCode}, gameId=${gameId}`);
                    }

                    // Game 자체의 상태도 active로 갱신
                    const game = await Game.findByPk(gameId);
                    if (game) {
                        await game.update({ status: 'active' });
                        // 다른 게임들은 draft 처리
                        await Game.update({ status: 'draft' }, {
                            where: { admin_id: adminId, id: { [require('sequelize').Op.ne]: game.id } }
                        });
                    }
                } else if (gameTitle) {
                    // gameTitle 기반 (기존 방식)
                    let game = await Game.findOne({ where: { admin_id: adminId, title: gameTitle } });
                    if (!game) {
                        game = await Game.create({ admin_id: adminId, title: gameTitle, game_type: gameType || 'quiz', status: 'active' });
                    } else {
                        await game.update({ status: 'active', game_type: gameType || game.game_type });
                    }
                    // 다른 게임들을 active에서 제외
                    await Game.update({ status: 'draft' }, {
                        where: { admin_id: adminId, id: { [Op.ne]: game.id } }
                    });
                    // 기존 waiting 세션 처리
                    const currentWaiting = await GameSession.findOne({ where: { pin_code: pinCode, status: 'waiting' } });
                    if (currentWaiting && currentWaiting.game_id !== game.id) {
                        await currentWaiting.update({ status: 'finished' });
                        await GameSession.create({ game_id: game.id, pin_code: pinCode, status: 'waiting' });
                    } else if (!currentWaiting) {
                        await GameSession.create({ game_id: game.id, pin_code: pinCode, status: 'waiting' });
                    }
                }
            } catch (err) {
                console.error('[Socket] admin_join 세션 처리 오류:', err);
            }

            // 관리자 입장 시 이 PIN의 이전 접속자 맵 초기화 (오래된 참가자 제거)
            // → 새로운 게임 라운드를 깨끗하게 시작
            for (const [sid, info] of pinParticipantMap.entries()) {
                if (info.pinCode === pinCode) {
                    // 실제로 소켓이 연결되어있지 않다면 맵에서 제거
                    const sock = io.sockets.sockets.get(sid);
                    if (!sock || !sock.connected) {
                        pinParticipantMap.delete(sid);
                    }
                }
            }

            // 현재 살아있는 참가자만 목록에 포함
            const currentParticipants = [];
            pinParticipantMap.forEach((info, sid) => {
                if (info.pinCode === pinCode) {
                    currentParticipants.push({
                        socketId: sid,
                        pinCode: info.pinCode,
                        name: info.nickname,
                        gameName: info.gameTitle,
                        joinedAt: info.joinedAt,
                        status: 'active',
                        id: info.participantId,
                        team: info.team,
                    });
                }
            });

            socket.emit('online_participants', { participants: currentParticipants });
        });

        // ──────────────────────────────────────────────
        // 대시보드 실시간 온라인 참가자 요청
        // ──────────────────────────────────────────────
        socket.on('request_online_participants', () => {
            const adminInfo = adminSocketMap.get(socket.id);
            if (!adminInfo) return;
            const { pinCode } = adminInfo;

            const currentParticipants = [];
            pinParticipantMap.forEach((info, sid) => {
                if (info.pinCode === pinCode) {
                    currentParticipants.push({
                        socketId: sid,
                        pinCode: info.pinCode,
                        name: info.nickname,
                        gameName: info.gameTitle,
                        joinedAt: info.joinedAt,
                        status: 'active',
                        id: info.participantId,
                        team: info.team,
                    });
                }
            });
            socket.emit('online_participants', { participants: currentParticipants });
        });

        // ──────────────────────────────────────────────
        // 관리자 게임방 입장 (HostGame 페이지)
        // ──────────────────────────────────────────────
        socket.on('host_join', (data) => {
            const { pinCode } = data;
            socket.join(pinCode);
            console.log(`[Socket] 호스트 방 입장: ${pinCode}`);
        });

        // ──────────────────────────────────────────────
        // 참가자 입장 — 핵심 수정 부분
        // 흐름: PIN → Admin.pin_code 조회 → Admin의 최신 Game 조회
        //       → GameSession 생성 or 조회 → Participant DB 저장
        //       → 관리자에게 실시간 알림
        // ──────────────────────────────────────────────
        socket.on('player_join', async (data) => {
            const { pinCode, nickname } = data;
            console.log(`[Socket] player_join: PIN=${pinCode}, 닉네임=${nickname}`);

            try {
                // 1. PIN 으로 관리자 조회
                const admin = await Admin.findOne({ where: { pin_code: pinCode } });
                if (!admin) {
                    socket.emit('join_error', { message: '유효하지 않은 PIN 번호입니다.' });
                    console.warn(`[Socket] 잘못된 PIN: ${pinCode}`);
                    return;
                }

                // 2. 해당 관리자의 가장 최근(활성) 게임 조회
                let game = await Game.findOne({
                    where: { admin_id: admin.id, status: 'active' },
                    order: [['created_at', 'DESC']],
                });
                // 활성 게임이 없으면 가장 최근 게임 사용
                if (!game) {
                    game = await Game.findOne({
                        where: { admin_id: admin.id },
                        order: [['created_at', 'DESC']],
                    });
                }
                if (!game) {
                    socket.emit('join_error', { message: '현재 진행 중인 게임이 없습니다.' });
                    console.warn(`[Socket] 관리자(${admin.id})의 게임 없음`);
                    return;
                }

                // 관리자가 오프라인 상태(서버 재시작 후 등)라면 참가자 접속을 차단해 좀비 세션 방지
                if (!pinToAdminSocket.has(pinCode)) {
                    console.log(`[Socket] 방 코드(${pinCode}) 호스트 미접속. 참가자 접속 차단`);
                    socket.emit('join_error', { message: '호스트가 현재 접속해 있지 않습니다.' });
                    return;
                }

                // 3. 대기 중인 GameSession 조회 or 새로 생성 (상태 무관 최신 방)
                let session = await GameSession.findOne({
                    where: { game_id: game.id, pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (!session) {
                    session = await GameSession.create({
                        game_id: game.id,
                        pin_code: pinCode,
                        status: 'waiting',
                    });
                    console.log(`[Socket] 새 세션 생성: sessionId=${session.id}, gameId=${game.id}`);
                }

                // 4. Participant DB 확인 및 저장 (닉네임 기반 중복 방지)
                let participant = await Participant.findOne({
                    where: { session_id: session.id, nickname: nickname.trim() }
                });

                if (participant) {
                    // 기존 참가자면 socket_id와 joined_at 최신화 (재접속)
                    await participant.update({
                        socket_id: socket.id,
                        joined_at: new Date()
                    });
                    console.log(`[Socket] 기존 참가자 재접속: id=${participant.id}, nickname=${nickname}`);
                } else {
                    // 신규 참가자 생성
                    participant = await Participant.create({
                        session_id: session.id,
                        nickname: nickname.trim(),
                        score: 0,
                        socket_id: socket.id,
                        joined_at: new Date(),
                    });
                    console.log(`[Socket] 신규 참가자 저장: id=${participant.id}, nickname=${nickname}`);
                }

                // 5. 소켓 방 입장 (game PIN 방)
                socket.join(pinCode);

                // 6. PIN 참가자 맵에 등록 (기존 쓰레기 소켓 정리 포함)
                for (let [sid, info] of pinParticipantMap.entries()) {
                    if (info.participantId === participant.id && sid !== socket.id) {
                        pinParticipantMap.delete(sid);
                    }
                }

                pinParticipantMap.set(socket.id, {
                    nickname: nickname.trim(),
                    pinCode,
                    gameTitle: game.title,
                    joinedAt: participant.joined_at,
                    participantId: participant.id,
                    team: participant.team,
                });

                // 7. 참가자 본인에게 성공 알림
                socket.emit('join_success', {
                    participantId: participant.id,
                    sessionId: session.id,
                    gameId: game.id,
                    gameTitle: game.title,
                    gameType: game.game_type,
                    settings: game.settings,
                    nickname,
                    sessionStatus: session.status,
                    rank: participant.rank,
                    buzzedAt: participant.buzzed_at,
                    elapsedMs: (participant.buzzed_at && session.started_at)
                        ? new Date(participant.buzzed_at).getTime() - new Date(session.started_at).getTime()
                        : null,
                    team: participant.team,
                });

                // 8. 같은 방의 모든 클라이언트에게 알림 (로비 인원수 업데이트)
                io.to(pinCode).emit('player_joined', {
                    nickname,
                    socketId: socket.id,
                    participantId: participant.id,
                    team: participant.team,
                });

                // 9. 관리자 대시보드에 실시간 참가자 업데이트 (socketId 포함)
                // 이미 같은 participantId가 맵에 있으면(기존 소켓의 잔재) join 대신 socketId만 갱신
                const adminRoomKey = `admin_${pinCode}`;
                const alreadyInAdmin = Array.from(pinParticipantMap.values()).some(
                    (info) => info.participantId === participant.id && info.pinCode === pinCode
                        && pinParticipantMap.size > 0
                );

                // 이 socket이 방금 등록한 것이므로 participant_update는 항상 보내되
                // type을 join vs update로 구분하여 관리자가 중복 추가 안 하도록 함
                io.to(adminRoomKey).emit('participant_update', {
                    type: alreadyInAdmin ? 'reconnect' : 'join',
                    participant: {
                        id: participant.id,
                        socketId: socket.id,
                        pinCode,
                        name: nickname,
                        gameName: game.title,
                        joinedAt: participant.joined_at,
                        status: 'active',
                        team: participant.team,
                    },
                });

            } catch (error) {
                console.error('[Socket] player_join 에러:', error);
                socket.emit('join_error', { message: '서버 오류가 발생했습니다.' });
            }
        });

        // ──────────────────────────────────────────────
        // ▶ 게임 시작 (Host → 모든 참가자)
        // ──────────────────────────────────────────────
        socket.on('admin_start_game', async (data) => {
            const { pinCode, gameTitle, settings, gameType } = data;
            const adminInfo = adminSocketMap.get(socket.id);
            console.log(`[Socket] 게임 시작: PIN=${pinCode}, gameTitle=${gameTitle}, gameType=${gameType}`);

            try {
                let session = null;

                // ① adminSocketMap에서 adminId를 얻어 현재 active 게임의 세션을 정확히 탐색
                if (adminInfo && adminInfo.adminId) {
                    const activeGame = await Game.findOne({
                        where: { admin_id: adminInfo.adminId, status: 'active' },
                        order: [['id', 'DESC']]
                    });
                    if (activeGame) {
                        session = await GameSession.findOne({
                            where: { pin_code: pinCode, game_id: activeGame.id },
                            order: [['id', 'DESC']],
                            include: [{ model: Game, attributes: ['id', 'title', 'game_type', 'settings'] }]
                        });
                        console.log(`[Socket] active 게임 탐색 결과: gameId=${activeGame.id}, title=${activeGame.title}, session=${session?.id}`);
                    }
                }

                // ② gameTitle이 주어진 경우 해당 게임의 세션 탐색 (fallback)
                if (!session && gameTitle) {
                    session = await GameSession.findOne({
                        where: { pin_code: pinCode },
                        order: [['id', 'DESC']],
                        include: [{
                            model: Game,
                            where: { title: gameTitle },
                            attributes: ['id', 'title', 'game_type', 'settings'],
                            required: true
                        }]
                    });
                    console.log(`[Socket] gameTitle로 세션 탐색: title=${gameTitle}, session=${session?.id}`);
                }

                // ③ 최종 fallback: pin_code 기준 최신 세션
                if (!session) {
                    session = await GameSession.findOne({
                        where: { pin_code: pinCode },
                        order: [['id', 'DESC']],
                        include: [{ model: Game, attributes: ['id', 'title', 'game_type', 'settings'] }]
                    });
                }

                if (!session) {
                    console.warn(`[Socket] 게임 시작: 세션없음 PIN=${pinCode}`);
                    return;
                }

                const sessionId = session.id;
                await session.update({ status: 'active', started_at: new Date() });

                // 부저 게임 맵 초기화
                buzzerSessionMap.set(sessionId, { rankCounter: 0, startTime: Date.now() });
                // OX 퀴즈 맵 초기화 (이전 게임 데이터 제거)
                oxAnswerMap.delete(sessionId);
                oxScoreMap.delete(sessionId);
                // MC 맵 초기화
                mcAnswerMap.delete(sessionId);
                mcScoreMap.delete(sessionId);
                mcTimeMap.delete(sessionId);
                mcQuestionStartMap.delete(sessionId);
                // 공감투표 맵 초기화
                empathyVoteMap.delete(sessionId);
                // 워드클라우드 맵 초기화
                wordCloudMap.delete(sessionId);

                // 현재 접속 중인 모든 플레이어를 해당 세션으로 마이그레이트
                // (세션이 바뀐어도 버저 클릭이 올바르게 동작하도록)
                const migrationPromises = [];
                for (const [sid, info] of pinParticipantMap.entries()) {
                    if (info.pinCode !== pinCode) continue;

                    migrationPromises.push((async () => {
                        let p = await Participant.findOne({
                            where: { session_id: sessionId, nickname: info.nickname }
                        });
                        if (!p) {
                            p = await Participant.create({
                                session_id: sessionId,
                                nickname: info.nickname,
                                score: 0,
                                socket_id: sid,
                                joined_at: new Date(),
                                team: info.team || null,
                            });
                        } else {
                            await p.update({ buzzed_at: null, rank: null, score: 0, socket_id: sid });
                        }
                        // 메모리맵의 participantId는 하나로 통일
                        info.participantId = p.id;
                        pinParticipantMap.set(sid, info);
                    })());
                }
                await Promise.all(migrationPromises);

                // 남아있는 기존 특정 세션의 초기화되지 않은 참가자 전체 초기화
                await Participant.update({ buzzed_at: null, rank: null, score: 0 }, { where: { session_id: sessionId } });

                // 전달받은 settings 가 있다면 병합 또는 대체
                const mergedSettings = Object.keys(settings || {}).length > 0 ? settings : (session.Game ? session.Game.settings : null);
                if (session.Game && settings && Object.keys(settings).length > 0) {
                    await session.Game.update({ settings: mergedSettings });
                }

                // 게임 시작 시 새로운 Session 기반 participant ID로 관리자 화면 동기화
                const currentParticipants = [];
                pinParticipantMap.forEach((info, sid) => {
                    if (info.pinCode === pinCode) {
                        currentParticipants.push({
                            socketId: sid,
                            pinCode: info.pinCode,
                            name: info.nickname,
                            gameName: info.gameTitle,
                            joinedAt: info.joinedAt,
                            status: 'active',
                            id: info.participantId,
                            team: info.team,
                        });
                    }
                });

                // 플레이어 화면에 새 sessionId 도 함께 전송으로 클라이언트가 새 세션을 인지하도록
                io.to(pinCode).emit('game_started', {
                    sessionId,
                    gameTitle: gameTitle || (session.Game ? session.Game.title : null),
                    gameType: session.Game ? session.Game.game_type : null,
                    settings: mergedSettings,
                    participants: currentParticipants
                });

                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('admin_game_started', { sessionId });
                io.to(adminRoomKey).emit('online_participants', { participants: currentParticipants });
            } catch (e) {
                console.error('[Socket] 게임 시작 처리 실패:', e);
            }
        });

        // ──────────────────────────────────────────────
        // ⏹ 게임 종료 (Host → 모든 참가자)
        // ──────────────────────────────────────────────
        socket.on('admin_end_game', async (data) => {
            const { pinCode } = data;
            console.log(`[Socket] 게임 종료: PIN=${pinCode}`);

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (session) {
                    await session.update({ status: 'finished', ended_at: new Date() });
                }

                io.to(pinCode).emit('game_ended');

                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('admin_game_ended');
            } catch (e) {
                console.error('[Socket] 게임 종료 처리 실패:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 🏆 순위 확인 (Host 화면 정렬 요청)
        // ──────────────────────────────────────────────
        socket.on('admin_show_ranking', async (data) => {
            const { pinCode } = data;
            console.log(`[Socket] 순위 확인: PIN=${pinCode}`);

            // 플레이어들에게 순위 화면 진입 알림
            io.to(pinCode).emit('show_ranking');

            const adminRoomKey = `admin_${pinCode}`;

            try {
                // DB에서 최신 세션의 등수 정보 조회
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']],
                    include: [{ model: Game, attributes: ['game_type', 'settings'] }]
                });

                if (session) {
                    const isMole = session.Game && session.Game.game_type === 'mole';
                    const isButtonBattle = session.Game && session.Game.game_type === 'button_battle';

                    let ranked;
                    if (isMole || isButtonBattle) {
                        ranked = await Participant.findAll({
                            where: { session_id: session.id },
                            order: [['score', 'DESC'], ['joined_at', 'ASC']]
                        });
                        // Compute ranks on the fly for mole
                        let currentRank = 0;
                        let lastScore = -1;
                        let jump = 1;
                        ranked.forEach((p, idx) => {
                            if (p.score !== lastScore) {
                                currentRank += jump;
                                jump = 1;
                                lastScore = p.score;
                            } else {
                                jump++;
                            }
                            p.rank = currentRank;
                        });
                    } else if (session.Game && session.Game.game_type === 'stopwatch') {
                        const targetMs = session.Game.settings && session.Game.settings.targetTime
                            ? session.Game.settings.targetTime * 1000 : 0;

                        ranked = await Participant.findAll({
                            where: { session_id: session.id }
                        });

                        ranked.sort((a, b) => {
                            if (a.elapsed_ms === null && b.elapsed_ms !== null) return 1;
                            if (b.elapsed_ms === null && a.elapsed_ms !== null) return -1;
                            if (a.elapsed_ms === null && b.elapsed_ms === null) return 0;

                            const diffA = Math.abs(targetMs - Number(a.elapsed_ms));
                            const diffB = Math.abs(targetMs - Number(b.elapsed_ms));
                            if (diffA === diffB) return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                            return diffA - diffB;
                        });

                        let currentRank = 0;
                        let lastDiff = -1;
                        let jump = 1;
                        ranked.forEach((p) => {
                            if (p.elapsed_ms !== null) {
                                const diff = Math.abs(targetMs - Number(p.elapsed_ms));
                                if (diff !== lastDiff) {
                                    currentRank += jump;
                                    jump = 1;
                                    lastDiff = diff;
                                } else {
                                    jump++;
                                }
                                p.rank = currentRank;
                            } else {
                                p.rank = null;
                            }
                        });
                    } else if (session.Game && session.Game.game_type === 'speed_piano') {
                        const scoreMap = speedPianoScoreMap.get(session.id) || new Map();
                        const leaderboard = [];
                        const processedPids = new Set();

                        for (const [, pInfo] of pinParticipantMap.entries()) {
                            if (pInfo.pinCode !== pinCode) continue;
                            const pid = pInfo.participantId;
                            if (!pid || processedPids.has(pid)) continue;
                            processedPids.add(pid);

                            const playerScore = scoreMap.get(pid) || { correctCount: 0, totalAttempts: 0, speed: 0, score: 0 };
                            leaderboard.push({
                                id: pid,
                                name: pInfo.nickname,
                                score: playerScore.score,
                                correctCount: playerScore.correctCount,
                                totalAttempts: playerScore.totalAttempts,
                                team: pInfo.team || null,
                            });
                        }

                        leaderboard.sort((a, b) => {
                            if (b.score !== a.score) return b.score - a.score;
                            if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
                            return 0;
                        });

                        leaderboard.forEach((p, i) => { p.rank = i + 1; });
                        const rankingList = leaderboard;

                        io.to(adminRoomKey).emit('admin_ranking_data', { ranking: rankingList });
                        io.to(pinCode).emit('player_ranking_data', { ranking: rankingList });

                        speedPianoSessionMap.delete(session.id);
                        speedPianoScoreMap.delete(session.id);
                        return; // Early return since we broadcasted internally
                    } else if (speedTileScoreMap.has(session.id) || (session.Game && (session.Game.game_type === 'speed_tile' || (session.Game.title && session.Game.title.includes('스피드 타일'))))) {
                        // 스피드 타일 랭킹 — scoreMap에 세션이 있는지 먼저 확인 (게임 타입보다 신뢰성 높음)
                        const scoreMap = speedTileScoreMap.get(session.id) || new Map();
                        const leaderboard = [];
                        const processedPids = new Set();

                        console.log(`[Speed Tile] 순위확인: sessionId=${session.id}, scoreMap size=${scoreMap.size}, pinCode=${pinCode}`);
                        console.log(`[Speed Tile] 현재 scoreMap keys:`, Array.from(scoreMap.keys()));

                        for (const [, pInfo] of pinParticipantMap.entries()) {
                            if (pInfo.pinCode !== pinCode) continue;
                            const pid = pInfo.participantId;
                            if (!pid || processedPids.has(pid)) continue;
                            processedPids.add(pid);

                            const playerScore = scoreMap.get(pid) || { correctCount: 0, totalAttempts: 0, speed: 0, score: 0 };
                            console.log(`[Speed Tile] 랭킹 데이터: pid=${pid}, name=${pInfo.nickname}, score=${playerScore.score}, correct=${playerScore.correctCount}`);
                            leaderboard.push({
                                id: pid,
                                name: pInfo.nickname,
                                score: playerScore.score,
                                correctCount: playerScore.correctCount || 0,
                                totalAttempts: playerScore.totalAttempts || 0,
                                team: pInfo.team || null,
                            });
                        }

                        leaderboard.sort((a, b) => {
                            if (b.score !== a.score) return b.score - a.score;
                            if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
                            return 0;
                        });

                        leaderboard.forEach((p, i) => { p.rank = i + 1; });

                        console.log(`[Speed Tile] 최종 랭킹 (${leaderboard.length}명):`, leaderboard.map(p => `${p.name}=${p.score}점`));

                        io.to(adminRoomKey).emit('admin_ranking_data', { ranking: leaderboard });
                        io.to(pinCode).emit('player_ranking_data', { ranking: leaderboard });

                        speedTileSessionMap.delete(session.id);
                        speedTileScoreMap.delete(session.id);
                        return; // Early return since we broadcasted internally
                    } else if (session.Game && (session.Game.game_type === 'word_cloud' || (session.Game.title && session.Game.title.includes('워드클라우드')))) {
                        // 워드클라우드: 순위 없음, 단어 목록만 반환
                        const wcMap = wordCloudMap.get(session.id) || new Map();
                        const wordList = Array.from(wcMap.entries()).map(([word, count]) => ({ word, count }));
                        wordList.sort((a, b) => b.count - a.count);
                        io.to(adminRoomKey).emit('admin_ranking_data', { ranking: [], wordList });
                        io.to(pinCode).emit('player_ranking_data', { ranking: [] });
                        wordCloudMap.delete(session.id);
                        return;
                    } else if (session.Game && (session.Game.game_type === 'empathy_vote' || session.Game.title.includes('공감투표'))) {
                        // 공감투표 랭킹: 하트 수 기준 정렬 및 공동 등수 처리
                        const evSession = empathyVoteMap.get(session.id) || { posts: new Map(), postCounter: 0 };
                        const posts = Array.from(evSession.posts.values());
                        posts.sort((a, b) => b.hearts.size - a.hearts.size);

                        let rank = 1;
                        for (let i = 0; i < posts.length; i++) {
                            if (i > 0 && posts[i].hearts.size < posts[i - 1].hearts.size) {
                                rank = i + 1;
                            }
                            posts[i].rank = rank;
                        }

                        const rankingList = posts.map((p) => ({
                            id: p.participantId,
                            postId: p.id,
                            name: p.nickname,
                            text: p.text,
                            hearts: p.hearts.size,
                            rank: p.rank,
                            score: p.hearts.size,
                        }));
                        io.to(adminRoomKey).emit('admin_ranking_data', { ranking: rankingList });
                        io.to(pinCode).emit('player_ranking_data', { ranking: rankingList });
                        empathyVoteMap.delete(session.id);
                        return;
                    } else {
                        ranked = await Participant.findAll({
                            where: { session_id: session.id },
                            order: [['rank', 'ASC'], ['buzzed_at', 'ASC'], ['joined_at', 'ASC']]
                        });
                    }

                    const rankingList = ranked.map(p => ({
                        id: p.id,
                        name: p.nickname,
                        rank: p.rank,
                        buzzedAt: p.buzzed_at,
                        score: p.score,
                        elapsedMs: p.elapsed_ms !== null ? Number(p.elapsed_ms) : null,
                        team: p.team,
                    }));

                    // 관리자에게 DB 기반 순위 전송
                    io.to(adminRoomKey).emit('admin_ranking_data', { ranking: rankingList });
                    // 참가자들에게도 순위 데이터 전송
                    io.to(pinCode).emit('player_ranking_data', { ranking: rankingList });
                }
            } catch (e) {
                console.error('[Socket] admin_show_ranking DB 조회 실패:', e);
            }
        }); // ← admin_show_ranking 종료

        // ──────────────────────────────────────────────
        // 🚪 관리자 게임방 퇴장 (대시보드 이동 시 강제 대기화면)
        // ──────────────────────────────────────────────
        socket.on('admin_leave_game', async (data) => {
            const { pinCode } = data;
            console.log(`[Socket] 관리자 게임방 퇴장: PIN=${pinCode}`);
            try {
                // 기존 활성 세션을 완료 상태로 변경
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (session) {
                    if (session.status !== 'finished') {
                        await session.update({ status: 'finished', ended_at: new Date() });
                    }

                    // 다음 참가를 대비하여 대기 중인 세션 하나 열어두기
                    const nextSession = await GameSession.findOne({
                        where: { game_id: session.game_id, pin_code: pinCode, status: 'waiting' }
                    });
                    if (!nextSession) {
                        await GameSession.create({
                            game_id: session.game_id,
                            pin_code: pinCode,
                            status: 'waiting'
                        });
                    }
                }
            } catch (e) {
                console.error('[Socket] admin_leave_game 에러:', e);
            }

            // 플레이어 화면 강제로 로비(대기방)로 이동
            io.to(pinCode).emit('admin_left');
        });

        // ──────────────────────────────────────────────
        // 사용자 팀 배정 갱신 (Admin → Server)
        // ──────────────────────────────────────────────
        socket.on('admin_update_teams', async (data) => {

            const { pinCode, assignments } = data; // assignments: [{ participantId, team }]
            console.log(`[Socket] 팀 배정 갱신: PIN=${pinCode}, 건수=${assignments?.length}`);

            try {
                // 1. DB 일괄 업데이트
                if (assignments && assignments.length > 0) {
                    const updatePromises = assignments.map(a =>
                        Participant.update(
                            { team: a.team },
                            { where: { id: a.participantId } }
                        )
                    );
                    await Promise.all(updatePromises);
                }

                // 2. 캐시 내역 업데이트 (메모리맵)
                pinParticipantMap.forEach((info, sid) => {
                    const match = assignments.find(a => a.participantId === info.participantId);
                    if (match) {
                        info.team = match.team;
                        pinParticipantMap.set(sid, info);
                    }
                });

                // 3. 대상 PIN 방의 모든 Client에게 브로드캐스트
                // participants는 관리자/일반참여자 모두 업데이트해야 하므로
                io.to(pinCode).emit('teams_updated', { assignments });
                io.to(`admin_${pinCode}`).emit('teams_updated', { assignments });

            } catch (e) {
                console.error('[Socket] 팀 배정 실패:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 💬 공감투표: 플레이어 글 제출
        // ──────────────────────────────────────────────
        socket.on('player_empathy_submit', async (data) => {
            const { pinCode, text } = data;
            const pInfo = pinParticipantMap.get(socket.id);
            if (!pInfo) return;

            // 글자 수 서버 재검증
            const trimmed = (text || '').trim().slice(0, 300);
            if (!trimmed) return;

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                // 세션 공감투표 맵 초기화
                if (!empathyVoteMap.has(session.id)) {
                    empathyVoteMap.set(session.id, { posts: new Map(), postCounter: 0 });
                }
                const evSession = empathyVoteMap.get(session.id);

                // 중복 제출 방지 (참가자 1인 1글)
                for (const post of evSession.posts.values()) {
                    if (post.participantId === pInfo.participantId) {
                        socket.emit('empathy_submit_error', { message: '이미 글을 등록하셨습니다.' });
                        return;
                    }
                }

                evSession.postCounter += 1;
                const postId = evSession.postCounter;
                const post = { id: postId, text: trimmed, nickname: pInfo.nickname, participantId: pInfo.participantId, hearts: new Set() };
                evSession.posts.set(postId, post);

                console.log(`[공감투표] 글 등록: PIN=${pinCode}, nickname=${pInfo.nickname}, postId=${postId}`);

                // 제출자에게 성공 알림
                socket.emit('empathy_submit_success', { postId });

                // 관리자 화면에 실시간 글 추가
                io.to(`admin_${pinCode}`).emit('admin_empathy_post', {
                    postId, text: trimmed, nickname: pInfo.nickname, participantId: pInfo.participantId, hearts: 0
                });
            } catch (e) {
                console.error('[공감투표] player_empathy_submit 에러:', e);
            }
        });

        // ──────────────────────────────────────────────
        // ☁️ 워드클라우드: 단어 제출 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_word_cloud_submit', async (data) => {
            const { pinCode, words } = data;
            const pInfo = pinParticipantMap.get(socket.id);
            if (!pInfo) return;

            // 단어 유효성 검사: 배열, 최대 5개, 각 단어 최대 20자
            if (!Array.isArray(words)) return;
            const validWords = words
                .map(w => (w || '').toString().trim())
                .filter(w => w.length > 0)
                .slice(0, 5)
                .map(w => w.slice(0, 20));

            if (validWords.length === 0) {
                socket.emit('word_cloud_submit_error', { message: '유효한 단어를 입력해주세요.' });
                return;
            }

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) {
                    socket.emit('word_cloud_submit_error', { message: '진행 중인 게임이 없습니다.' });
                    return;
                }

                // 세션 맵 초기화
                if (!wordCloudMap.has(session.id)) {
                    wordCloudMap.set(session.id, new Map());
                }
                const wcMap = wordCloudMap.get(session.id);

                // 단어 빈도수 집계
                for (const word of validWords) {
                    wcMap.set(word, (wcMap.get(word) || 0) + 1);
                }

                console.log(`[워드클라우드] 단어 제출: PIN=${pinCode}, nickname=${pInfo.nickname}, words=${validWords.join(',')}`);

                // 참가자에게 제출 완료 알림
                socket.emit('word_cloud_submit_ok', { words: validWords });

                // 관리자에게 전체 단어 목록 전송
                const wordList = Array.from(wcMap.entries()).map(([word, count]) => ({ word, count }));
                io.to(`admin_${pinCode}`).emit('admin_word_cloud_update', { wordList });

            } catch (e) {
                console.error('[워드클라우드] player_word_cloud_submit 에러:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 💗 공감투표: 하트 클릭 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_empathy_heart', async (data) => {
            const { pinCode, postId } = data;
            const pInfo = pinParticipantMap.get(socket.id);
            if (!pInfo) return;

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                const evSession = empathyVoteMap.get(session.id);
                if (!evSession) return;

                const targetPost = evSession.posts.get(postId);
                if (!targetPost) return;

                // 본인 글에는 하트 불가
                if (targetPost.participantId === pInfo.participantId) {
                    socket.emit('empathy_heart_error', { message: '본인의 글에는 하트를 누를 수 없습니다.' });
                    return;
                }

                // 이미 누른 하트는 취소 (토글), 아니면 추가
                let isRemoved = false;
                if (targetPost.hearts.has(pInfo.participantId)) {
                    targetPost.hearts.delete(pInfo.participantId);
                    isRemoved = true;
                } else {
                    // 추가 시에만 최대 3개 제한 (이미 하트 누른 수 계산)
                    let myHeartCount = 0;
                    for (const post of evSession.posts.values()) {
                        if (post.hearts.has(pInfo.participantId)) myHeartCount++;
                    }
                    if (myHeartCount >= 3) {
                        socket.emit('empathy_heart_error', { message: '하트는 최대 3개까지만 누를 수 있습니다.' });
                        return;
                    }
                    targetPost.hearts.add(pInfo.participantId);
                }

                console.log(`[공감투표] 하트 ${isRemoved ? '취소' : '추가'}: PIN=${pinCode}, postId=${postId}, from=${pInfo.nickname}, 총=${targetPost.hearts.size}`);

                // 전체 게시글 목록을 하트 순 정렬해서 관리자에게 전송
                const sortedPosts = Array.from(evSession.posts.values())
                    .sort((a, b) => b.hearts.size - a.hearts.size)
                    .map(p => ({ postId: p.id, text: p.text, nickname: p.nickname, participantId: p.participantId, hearts: p.hearts.size }));

                io.to(`admin_${pinCode}`).emit('admin_empathy_update', { posts: sortedPosts });

                // 클릭한 플레이어에게만 확인 응답 (취소 여부 포함)
                socket.emit('empathy_heart_ok', { postId, hearts: targetPost.hearts.size, isRemoved });

            } catch (e) {
                console.error('[공감투표] player_empathy_heart 에러:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 🛑 공감투표: 게임 종료 (Admin → 모든 참가자)
        // ──────────────────────────────────────────────
        socket.on('admin_end_empathy_vote', async (data) => {
            const { pinCode } = data;
            console.log(`[공감투표] 게임 종료: PIN=${pinCode}`);

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (session) {
                    await session.update({ status: 'finished', ended_at: new Date() });

                    const evSession = empathyVoteMap.get(session.id) || { posts: new Map() };
                    const posts = Array.from(evSession.posts.values()).map(p => ({
                        postId: p.id,
                        text: p.text,
                        nickname: p.nickname,
                        participantId: p.participantId,
                        hearts: p.hearts.size
                    }));

                    // 관리자 화면 종료 알림
                    io.to(`admin_${pinCode}`).emit('admin_game_ended');
                    // 플레이어들에게 모든 글 공개 (투표 시작)
                    io.to(pinCode).emit('empathy_vote_reveal', { posts });
                    // 기존 game_ended도 발송 (공통 처리)
                    io.to(pinCode).emit('game_ended');
                }
            } catch (e) {
                console.error('[공감투표] admin_end_empathy_vote 에러:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 🎫 행운권 추첨 (Admin → Server)
        // ──────────────────────────────────────────────
        socket.on('admin_lucky_draw', async (data) => {
            const { pinCode } = data;
            try {
                // 이전 당첨자 목록 (세션 내 메모리)
                if (!luckyDrawMap.has(pinCode)) luckyDrawMap.set(pinCode, []);
                const winners = luckyDrawMap.get(pinCode);

                // 현재 접속 참가자 목록
                const participants = [];
                pinParticipantMap.forEach((info, sid) => {
                    if (info.pinCode === pinCode) participants.push({ socketId: sid, nickname: info.nickname });
                });

                // 이전 당첨자 제외한 후보 (허용 설정에 따라 분기)
                const candidates = data.allowDuplicateWinner 
                    ? participants 
                    : participants.filter(p => !winners.find(w => w.nickname === p.nickname));
                    
                if (candidates.length === 0) {
                    io.to(`admin_${pinCode}`).emit('lucky_draw_no_candidates', {});
                    return;
                }

                // 랜덤 선택
                const winner = candidates[Math.floor(Math.random() * candidates.length)];
                winners.push({ nickname: winner.nickname });

                console.log(`[행운권 추첨] 당첨자: ${winner.nickname}, PIN=${pinCode}`);

                // 관리자에게 당첨자 정보 + 전체 당첨 이력 전송
                io.to(`admin_${pinCode}`).emit('lucky_draw_result', {
                    winner: winner.nickname,
                    previousWinners: winners.slice(0, -1).map(w => w.nickname),
                    allWinners: winners.map(w => w.nickname),
                });

                // 참가자별 당첨/낙첨 메시지
                participants.forEach(p => {
                    const isWinner = p.nickname === winner.nickname;
                    io.to(p.socketId).emit('lucky_draw_player_result', { isWinner, winner: winner.nickname });
                });
            } catch (e) {
                console.error('[행운권 추첨] 에러:', e);
            }
        });

        // 행운권 추첨 종료 (당첨 이력 초기화)
        socket.on('admin_lucky_draw_reset', (data) => {
            const { pinCode } = data;
            luckyDrawMap.delete(pinCode);
        });

        // ──────────────────────────────────────────────
        // 🪜 사다리 게임: 관리자 → 게임 시작
        // ──────────────────────────────────────────────
        socket.on('admin_ladder_start', (data) => {
            const { pinCode, ladderCount, assignments, prizes, mode } = data;
            // assignments: [{ id, name, ladderIndex }]  (개인전: name=닉네임, 팀전: name=팀명)
            // prizes: [string]  각 사다리 하단 경품 (인덱스 대응)

            console.log(`[사다리] 게임 시작: PIN=${pinCode}, 사다리수=${ladderCount}, mode=${mode}`);

            // ① 랜덤 사다리 구조 생성
            const ROW_COUNT = Math.max(10, ladderCount * 3);
            const bars = []; // { row, col } — col~col+1 연결
            for (let row = 0; row < ROW_COUNT; row++) {
                const used = new Set();
                for (let col = 0; col < ladderCount - 1; col++) {
                    if (!used.has(col) && !used.has(col + 1) && Math.random() < 0.42) {
                        bars.push({ row, col });
                        used.add(col);
                        used.add(col + 1);
                    }
                }
            }

            // ② 각 사다리 경로 추적 → 결과 계산
            const results = {}; // ladderIndex → prizeIndex (=도착 사다리 번호)
            for (let start = 0; start < ladderCount; start++) {
                let col = start;
                for (let row = 0; row < ROW_COUNT; row++) {
                    const barRight = bars.find(b => b.row === row && b.col === col);
                    const barLeft  = bars.find(b => b.row === row && b.col === col - 1);
                    if (barRight) col += 1;
                    else if (barLeft) col -= 1;
                }
                results[start] = col; // 시작 사다리 start → 도착 인덱스 col
            }

            ladderGameMap.set(pinCode, { ladderCount, bars, assignments, prizes, results, mode });

            // ③ 모든 플레이어에게 전송
            io.to(pinCode).emit('ladder_game_started', {
                ladderCount,
                bars,
                assignments,
                prizes,
                results,
                mode,
                rowCount: ROW_COUNT,
            });

            // ④ 관리자에게도 동일 전송
            io.to(`admin_${pinCode}`).emit('ladder_game_started', {
                ladderCount, bars, assignments, prizes, results, mode, rowCount: ROW_COUNT,
            });

            console.log(`[사다리] 구조 생성 완료: bars=${bars.length}개, results=`, results);
        });

        // 사다리 게임 종료 / 초기화
        socket.on('admin_ladder_reset', (data) => {
            const { pinCode } = data;
            ladderGameMap.delete(pinCode);
        });

        // ──────────────────────────────────────────────
        // 🔴 스피드 부저 클릭 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_buzzer_click', async (data) => {
            const { pinCode } = data; // 클라이언트 sessionId는 신뢰하지 않고 서버가 판단
            console.log(`[Socket] 부저 클릭: socketId=${socket.id}, PIN=${pinCode}`);

            try {
                // ① 서버 관리 현재 활성 세션 조회 (클라이언트 sessionId 무시)
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!activeSession) {
                    console.warn(`[Socket] 부저 클릭 - 활성 세션 없음, PIN=${pinCode}`);
                    return;
                }
                const sessionId = activeSession.id;

                // ② 부저 상태 로드
                let sessionState = buzzerSessionMap.get(sessionId);
                if (!sessionState) {
                    // 맵에 없으면 DB의 started_at을 기준으로 새로 만들기
                    const startMs = activeSession.started_at
                        ? new Date(activeSession.started_at).getTime()
                        : Date.now();
                    sessionState = { rankCounter: 0, startTime: startMs };
                    buzzerSessionMap.set(sessionId, sessionState);
                }

                // ③ 소켓 맵에서 닉네임 가져오기 (socket.id 기준)
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) {
                    console.warn(`[Socket] 부저 클릭 - pinParticipantMap에 없음, socketId=${socket.id}`);
                    return;
                }

                // ④ 히니임으로 정확한 세션의 참가자 화인
                let participant = await Participant.findOne({
                    where: { session_id: sessionId, nickname: pInfo.nickname }
                });
                if (!participant) {
                    // 관리자가 시작할 때 migrate되지 않은 코너 케이스를 대비
                    participant = await Participant.create({
                        session_id: sessionId,
                        nickname: pInfo.nickname,
                        score: 0,
                        socket_id: socket.id,
                        joined_at: new Date(),
                        team: pInfo.team || null,
                    });
                    pInfo.participantId = participant.id;
                    pinParticipantMap.set(socket.id, pInfo);
                }

                // ⑤ 이미 누른 경우 무시
                if (participant.buzzed_at) {
                    console.log(`[Socket] 부저 클릭 - 이미 누름: ${pInfo.nickname}`);
                    return;
                }

                // ⑥ 순위 및 시간 계산
                sessionState.rankCounter += 1;
                const currentRank = sessionState.rankCounter;
                const buzzedAt = new Date();
                const elapsedMs = buzzedAt.getTime() - sessionState.startTime;
                buzzerSessionMap.set(sessionId, sessionState);

                // ⑦ DB 업데이트 (정확한 ms 도 함께 저장)
                await participant.update({ buzzed_at: buzzedAt, rank: currentRank, elapsed_ms: elapsedMs });

                const participantId = participant.id;

                // ⑧ 본인에게 결과 즉시 전송
                socket.emit('buzzer_result', {
                    rank: currentRank,
                    elapsedMs,
                    buzzedAt: buzzedAt.toISOString()
                });

                // ⑨ 관리자에게 실시간 업데이트 전달
                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('admin_buzzer_update', {
                    participantId,
                    rank: currentRank,
                    buzzedAt: buzzedAt.toISOString(),
                    elapsedMs
                });
            } catch (e) {
                console.error('[Socket] 부저 클릭 처리 실패:', e);
            }
        });

        // ──────────────────────────────────────────────
        // ⏱ 스탑워치 클릭 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_stopwatch_stop', async (data) => {
            const { pinCode, elapsedMs } = data;
            console.log(`[Socket] 스탑워치 정지: socketId=${socket.id}, PIN=${pinCode}, 경과시간=${elapsedMs}ms`);

            try {
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!activeSession) return;

                const sessionId = activeSession.id;
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                let participant = await Participant.findOne({
                    where: { session_id: sessionId, nickname: pInfo.nickname }
                });
                if (!participant) return;

                if (participant.buzzed_at) {
                    return; // 이미 누름
                }

                const buzzedAt = new Date();

                // 순위 계산 없이 시간만 저장
                await participant.update({ buzzed_at: buzzedAt, elapsed_ms: elapsedMs });

                socket.emit('stopwatch_result', {
                    elapsedMs,
                    buzzedAt: buzzedAt.toISOString()
                });

                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('admin_stopwatch_update', {
                    participantId: participant.id,
                    buzzedAt: buzzedAt.toISOString(),
                    elapsedMs
                });
            } catch (e) {
                console.error('[Socket] 스탑워치 클릭 처리 실패:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 👆 버튼 배틀 점수 갱신 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_button_battle_score', async (data) => {
            const { pinCode, score } = data;

            try {
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!activeSession) return;

                const sessionId = activeSession.id;
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                let participant = await Participant.findOne({
                    where: { session_id: sessionId, nickname: pInfo.nickname }
                });
                if (!participant) return;

                const buzzedAt = new Date();

                // 점수 및 시간 업데이트
                await participant.update({ buzzed_at: buzzedAt, score: score });

                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('admin_button_battle_update', {
                    participantId: participant.id,
                    buzzedAt: buzzedAt.toISOString(),
                    score
                });
            } catch (e) {
                console.error('[Socket] 버튼 배틀 점수 갱신 에러:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 강제 로그아웃 (관리자 → 특정 참가자)
        // ──────────────────────────────────────────────
        socket.on('force_logout', (data) => {
            const { targetSocketId, pinCode } = data;
            console.log(`[Socket] 강제 로그아웃: targetSocketId=${targetSocketId}, PIN=${pinCode}`);

            // 대상 소켓에 로그아웃 명령 발송
            io.to(targetSocketId).emit('force_logout_user');

            // 참가자 맵에서 제거
            const participantInfo = pinParticipantMap.get(targetSocketId);
            if (participantInfo) {
                pinParticipantMap.delete(targetSocketId);

                // 관리자에게 퇴장 알림
                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('participant_update', {
                    type: 'leave',
                    socketId: targetSocketId,
                    pinCode,
                });
                console.log(`[Socket] 강제 로그아웃 완료: ${participantInfo.nickname}`);
            }

            // DB socket_id 초기화
            Participant.update(
                { socket_id: null },
                { where: { socket_id: targetSocketId } }
            ).catch(() => { });
        });

        // ──────────────────────────────────────────────
        // 📝 실시간 설문 (패들렛) 메모 제출 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_submit_note', async (data) => {
            const { pinCode, content, color, x, y } = data;

            try {
                // 1. Participant 정보 조회
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) {
                    console.warn(`[Socket] 노트 제출 - 참가자 정보 없음: socketId=${socket.id}`);
                    return;
                }

                // 2. 활성 세션 조회
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!activeSession) {
                    console.warn(`[Socket] 노트 제출 - 활성 세션 없음: PIN=${pinCode}`);
                    return;
                }

                // 3. DB에 노트 저장
                const newNote = await Note.create({
                    session_id: activeSession.id,
                    participant_id: pInfo.participantId,
                    content,
                    color: color || '#fbbf24',
                    x: x || Math.random() * 80, // 0~80% 범위의 랜덤 위치
                    y: y || Math.random() * 80
                });

                // 4. 작성자 정보 포함
                const noteData = {
                    id: newNote.id,
                    content: newNote.content,
                    color: newNote.color,
                    x: newNote.x,
                    y: newNote.y,
                    nickname: pInfo.nickname,
                    team: pInfo.team,
                    createdAt: newNote.created_at
                };

                // 5. 방의 모든 사람(주로 Admin)에게 브로드캐스트
                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('new_note', noteData);
                // 본인 방(다른 플레이어들 포함)에도 브로드캐스트 원한다면:
                io.to(pinCode).emit('new_note', noteData);

                // 본인에게 성공 응답
                socket.emit('note_submit_success');
            } catch (err) {
                console.error('[Socket] 부저 클릭 처리 실패 / 노트 작성 에러:', err);
                socket.emit('note_submit_error', { message: '메모 저장에 실패했습니다.' });
            }
        });

        // ──────────────────────────────────────────────
        // 관리자 패들렛 보드 초기 로드 등 필요 시
        // ──────────────────────────────────────────────
        socket.on('admin_request_notes', async (data) => {
            const { pinCode } = data;
            try {
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (activeSession) {
                    const notes = await Note.findAll({
                        where: { session_id: activeSession.id },
                        include: [{ model: Participant, attributes: ['nickname', 'team'] }],
                        order: [['created_at', 'ASC']]
                    });

                    const mappedNotes = notes.map(n => ({
                        id: n.id,
                        content: n.content,
                        color: n.color,
                        x: n.x,
                        y: n.y,
                        nickname: n.Participant?.nickname || 'Unknown',
                        team: n.Participant?.team,
                        createdAt: n.created_at
                    }));

                    socket.emit('all_notes', { notes: mappedNotes });
                }
            } catch (err) {
                console.error('[Socket] admin_request_notes 에러:', err);
            }
        });

        // ──────────────────────────────────────────────
        // 📋 실시간 게시판(Board) 포스트 제출 (Player → Server)
        // ──────────────────────────────────────────────
        socket.on('player_submit_board_post', async (data) => {
            const { pinCode, content, imageUrl, attachmentUrl, attachmentName } = data;

            try {
                // 1. Participant 정보 조회
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) {
                    console.warn(`[Socket] 게시판 제출 - 참가자 정보 없음: socketId=${socket.id}`);
                    return;
                }

                // 2. 활성 세션 조회 (게시판 게임)
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });

                if (!activeSession) {
                    console.warn(`[Socket] 게시판 제출 - 활성 세션 없음: PIN=${pinCode}`);
                    socket.emit('board_post_error', { message: '현재 진행 중인 게시판 세션이 없습니다.' });
                    return;
                }

                // 3. DB에 BoardPost 저장
                const newPost = await BoardPost.create({
                    session_id: activeSession.id,
                    participant_id: pInfo.participantId,
                    content: content || '',
                    image_url: imageUrl || null,
                    attachment_url: attachmentUrl || null,
                    attachment_name: attachmentName || null
                });

                // 4. 작성자 정보 포함
                const postData = {
                    id: newPost.id,
                    content: newPost.content,
                    imageUrl: newPost.image_url,
                    attachmentUrl: newPost.attachment_url,
                    attachmentName: newPost.attachment_name,
                    nickname: pInfo.nickname,
                    team: pInfo.team,
                    createdAt: newPost.created_at
                };

                // 5. 방의 모든 사람(주로 Admin)에게 브로드캐스트
                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('new_board_post', postData);
                io.to(pinCode).emit('new_board_post', postData); // User pages might also want to see it?

                // 본인에게 성공 응답
                socket.emit('board_post_success');
            } catch (err) {
                console.error('[Socket] 게시판 작성 에러:', err);
                socket.emit('board_post_error', { message: '게시물 저장에 실패했습니다.' });
            }
        });

        // ──────────────────────────────────────────────
        // 📋 게시판 데이터 초기 로드 (Admin)
        // ──────────────────────────────────────────────
        socket.on('admin_request_board_posts', async (data) => {
            const { pinCode } = data;
            try {
                const activeSession = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (activeSession) {
                    const posts = await BoardPost.findAll({
                        where: { session_id: activeSession.id },
                        include: [{ model: Participant, attributes: ['nickname', 'team'] }],
                        order: [['created_at', 'ASC']]
                    });

                    const mappedPosts = posts.map(p => ({
                        id: p.id,
                        content: p.content,
                        imageUrl: p.image_url,
                        attachmentUrl: p.attachment_url,
                        attachmentName: p.attachment_name,
                        nickname: p.Participant?.nickname || 'Unknown',
                        team: p.Participant?.team,
                        createdAt: p.created_at
                    }));

                    socket.emit('all_board_posts', { posts: mappedPosts });
                }
            } catch (err) {
                console.error('[Socket] admin_request_board_posts 에러:', err);
            }
        });

        // ──────────────────────────────────────────────────────────
        // OX 퀴즈: 관리자 → 다음 문제 전송
        // ──────────────────────────────────────────────────────────
        socket.on('admin_ox_next_question', async (data) => {
            const { pinCode, questionIndex, gameId } = data;
            try {
                const game = await Game.findByPk(gameId, {
                    include: [{ model: Question, include: [Option], order: [['order_num', 'ASC']] }],
                    order: [[Question, 'order_num', 'ASC']]
                });
                if (!game || !game.Questions) return;
                const q = game.Questions[questionIndex];
                if (!q) return;

                const questionData = {
                    questionIndex,
                    total: game.Questions.length,
                    questionText: q.question_text,
                    timeLimit: q.time_limit || 5,
                    questionId: q.id,
                };

                // 관리자에게도 플레이어에게도 전송
                io.to(pinCode).emit('ox_question', questionData);
                io.to(`admin_${pinCode}`).emit('ox_question', questionData);
                console.log(`[OX] 문제 ${questionIndex + 1} 전송: PIN=${pinCode}`);
            } catch (e) {
                console.error('[OX] admin_ox_next_question 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // OX 퀴즈: 플레이어 답변 제출
        // ──────────────────────────────────────────────────────────
        socket.on('player_ox_answer', async (data) => {
            const { pinCode, questionIndex, answer } = data;
            try {
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                const sid = session.id;
                const pid = pInfo.participantId;

                if (!oxAnswerMap.has(sid)) oxAnswerMap.set(sid, new Map());
                const participantAnswers = oxAnswerMap.get(sid).get(pid) || [];
                // Only record first answer per question
                if (!participantAnswers.find(a => a.qIdx === questionIndex)) {
                    participantAnswers.push({ qIdx: questionIndex, answer });
                    oxAnswerMap.get(sid).set(pid, participantAnswers);
                }

                // 관리자에게 답변 현황 전송
                io.to(`admin_${pinCode}`).emit('ox_answer_received', {
                    participantId: pid,
                    nickname: pInfo.nickname,
                    team: pInfo.team,
                    questionIndex,
                    answer
                });
            } catch (e) {
                console.error('[OX] player_ox_answer 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // OX 퀴즈: 관리자 정답공개
        // ──────────────────────────────────────────────────────────
        socket.on('admin_ox_reveal', async (data) => {
            const { pinCode, questionIndex, correctAnswer } = data;
            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sid = session.id;

                // 관리자에게 보낼 정답 공개
                io.to(`admin_${pinCode}`).emit('ox_revealed', { questionIndex, correctAnswer });

                // 각 플레이어마다 개인 결과 전송 + 점수 계산
                if (!oxScoreMap.has(sid)) oxScoreMap.set(sid, new Map());
                const scoreMap = oxScoreMap.get(sid);
                const answerMapForSession = oxAnswerMap.get(sid) || new Map();

                // 모든 플레이어에게 개인 결과열 전송
                for (const [pSid, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    const answers = answerMapForSession.get(pid) || [];
                    const myAnswer = answers.find(a => a.qIdx === questionIndex);
                    const isCorrect = myAnswer && myAnswer.answer === correctAnswer;

                    if (isCorrect) {
                        scoreMap.set(pid, (scoreMap.get(pid) || 0) + 1);
                    }

                    io.to(pSid).emit('ox_result', {
                        questionIndex,
                        correctAnswer,
                        yourAnswer: myAnswer ? myAnswer.answer : null,
                        isCorrect: !!isCorrect
                    });
                }
                oxScoreMap.set(sid, scoreMap);
                console.log(`[OX] 정답공개 Q${questionIndex}: ${correctAnswer}, PIN=${pinCode}`);
            } catch (e) {
                console.error('[OX] admin_ox_reveal 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // OX 퀴즈: 과유 종료 및 점수 집계
        // ──────────────────────────────────────────────────────────
        socket.on('admin_ox_end', async (data) => {
            const { pinCode } = data;
            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sid = session.id;

                // 게임 세션 종료
                await session.update({ status: 'finished', ended_at: new Date() });

                const scoreMap = oxScoreMap.get(sid) || new Map();

                // 현재 접속 중인 참가자만 집계 (pinParticipantMap 기준)
                const leaderboard = [];
                const teamScores = {};
                const processedPids = new Set(); // 중복 방지 (같은 닉네임 중복 소켓 처리)

                for (const [, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    if (!pid || processedPids.has(pid)) continue;
                    processedPids.add(pid);

                    const score = scoreMap.get(pid) || 0;

                    // DB 점수 저장
                    Participant.update({ score }, { where: { id: pid } }).catch(() => { });

                    const entry = { id: pid, name: pInfo.nickname, team: pInfo.team || null, score };
                    leaderboard.push(entry);

                    if (pInfo.team) {
                        teamScores[pInfo.team] = (teamScores[pInfo.team] || 0) + score;
                    }
                }

                // 정렬 (점수 내림차순)
                leaderboard.sort((a, b) => b.score - a.score);
                leaderboard.forEach((p, i) => { p.rank = i + 1; });

                const teamLeaderboard = Object.entries(teamScores)
                    .map(([team, score]) => ({ team, score }))
                    .sort((a, b) => b.score - a.score);

                // 관리자에게 최종 결과 전송
                io.to(`admin_${pinCode}`).emit('ox_final_scores', { leaderboard, teamLeaderboard });

                // 각 플레이어에게 개인 점수 전송
                for (const [pSid, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    const myScore = scoreMap.get(pid) || 0;
                    const myEntry = leaderboard.find(e => e.id === pid);
                    io.to(pSid).emit('ox_game_over', {
                        score: myScore,
                        rank: myEntry ? myEntry.rank : null,
                        total: leaderboard.length
                    });
                }

                // 메모리 정리
                oxAnswerMap.delete(sid);
                oxScoreMap.delete(sid);
                io.to(pinCode).emit('game_ended');
                console.log(`[OX] 게임 종료 및 점수집계 완료: PIN=${pinCode}`);
            } catch (e) {
                console.error('[OX] admin_ox_end 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 4지선다 퀴즈: 관리자 → 다음 문제 전송
        // ──────────────────────────────────────────────────────────
        socket.on('admin_mc_next_question', async (data) => {
            const { pinCode, questionIndex, gameId, options } = data;
            try {
                const game = await Game.findByPk(gameId, {
                    include: [{ model: Question, include: [Option], order: [['order_num', 'ASC']] }],
                    order: [[Question, 'order_num', 'ASC']]
                });
                if (!game || !game.Questions) return;
                const q = game.Questions[questionIndex];
                if (!q) return;

                const questionData = {
                    questionIndex,
                    total: game.Questions.length,
                    questionText: q.question_text,
                    timeLimit: q.time_limit || 20,
                    questionId: q.id,
                    options: options || q.Options.map((o, idx) => ({ text: o.option_text, index: idx + 1 }))
                };

                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (session) {
                    mcQuestionStartMap.set(session.id, Date.now());
                }

                io.to(pinCode).emit('mc_question', questionData);
                io.to(`admin_${pinCode}`).emit('mc_question', questionData);
                console.log(`[MC] 문제 ${questionIndex + 1} 전송: PIN=${pinCode}`);
            } catch (e) {
                console.error('[MC] admin_mc_next_question 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 4지선다 퀴즈: 플레이어 답변 제출
        // ──────────────────────────────────────────────────────────
        socket.on('player_mc_answer', async (data) => {
            const { pinCode, questionIndex, answer } = data; // answer text
            try {
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                const sid = session.id;
                const pid = pInfo.participantId;

                const qStart = mcQuestionStartMap.get(sid) || Date.now();
                const timeTaken = Date.now() - qStart;

                if (!mcAnswerMap.has(sid)) mcAnswerMap.set(sid, new Map());
                const participantAnswers = mcAnswerMap.get(sid).get(pid) || [];

                // 중복 제출 차단
                if (!participantAnswers.find(a => a.qIdx === questionIndex)) {
                    participantAnswers.push({ qIdx: questionIndex, answer, timeTaken });
                    mcAnswerMap.get(sid).set(pid, participantAnswers);
                }

                // 관리자에게 전달
                io.to(`admin_${pinCode}`).emit('mc_answer_received', {
                    participantId: pid,
                    nickname: pInfo.nickname,
                    team: pInfo.team,
                    questionIndex,
                    answer
                });
            } catch (e) {
                console.error('[MC] player_mc_answer 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 4지선다 퀴즈: 관리자 정답공개
        // ──────────────────────────────────────────────────────────
        socket.on('admin_mc_reveal', async (data) => {
            const { pinCode, questionIndex, correctAnswer } = data;
            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sid = session.id;

                io.to(`admin_${pinCode}`).emit('mc_revealed', { questionIndex, correctAnswer });

                if (!mcScoreMap.has(sid)) mcScoreMap.set(sid, new Map());
                if (!mcTimeMap.has(sid)) mcTimeMap.set(sid, new Map());

                const scoreMap = mcScoreMap.get(sid);
                const timeMap = mcTimeMap.get(sid);
                const answerMapForSession = mcAnswerMap.get(sid) || new Map();

                for (const [pSid, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    const answers = answerMapForSession.get(pid) || [];
                    const myAnswer = answers.find(a => a.qIdx === questionIndex);
                    const isCorrect = myAnswer && myAnswer.answer === correctAnswer;

                    if (isCorrect) {
                        scoreMap.set(pid, (scoreMap.get(pid) || 0) + 1);
                        timeMap.set(pid, (timeMap.get(pid) || 0) + (myAnswer.timeTaken || 0));
                    } else if (myAnswer) {
                        timeMap.set(pid, (timeMap.get(pid) || 0) + (myAnswer.timeTaken || 0));
                    }

                    io.to(pSid).emit('mc_result', {
                        questionIndex,
                        correctAnswer,
                        yourAnswer: myAnswer ? myAnswer.answer : null,
                        isCorrect: !!isCorrect
                    });
                }
                mcScoreMap.set(sid, scoreMap);
                mcTimeMap.set(sid, timeMap);
            } catch (e) {
                console.error('[MC] admin_mc_reveal 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 4지선다 퀴즈: 게임 종료 및 집계
        // ──────────────────────────────────────────────────────────
        socket.on('admin_mc_end', async (data) => {
            const { pinCode } = data;
            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sid = session.id;

                await session.update({ status: 'finished', ended_at: new Date() });

                const scoreMap = mcScoreMap.get(sid) || new Map();
                const timeMap = mcTimeMap.get(sid) || new Map();

                const leaderboard = [];
                const teamScores = {};
                const processedPids = new Set();

                for (const [, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    if (!pid || processedPids.has(pid)) continue;
                    processedPids.add(pid);

                    const score = scoreMap.get(pid) || 0;
                    const totalTime = timeMap.get(pid) || 0;

                    Participant.update({ score, elapsed_ms: totalTime }, { where: { id: pid } }).catch(() => { });

                    const entry = { id: pid, name: pInfo.nickname, team: pInfo.team || null, score, totalTime };
                    leaderboard.push(entry);

                    if (pInfo.team) {
                        teamScores[pInfo.team] = (teamScores[pInfo.team] || 0) + score;
                    }
                }

                // 점수 높은 순 -> 동일 점수일 경우 소요시간 짧은 순
                leaderboard.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
                    return 0;
                });
                leaderboard.forEach((p, i) => { p.rank = i + 1; });

                const teamLeaderboard = Object.entries(teamScores)
                    .map(([team, score]) => ({ team, score }))
                    .sort((a, b) => b.score - a.score);

                io.to(`admin_${pinCode}`).emit('mc_final_scores', { leaderboard, teamLeaderboard });

                for (const [pSid, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    const myScore = scoreMap.get(pid) || 0;
                    const myEntry = leaderboard.find(e => e.id === pid);
                    io.to(pSid).emit('mc_game_over', {
                        score: myScore,
                        rank: myEntry ? myEntry.rank : null,
                        total: leaderboard.length
                    });
                }

                mcAnswerMap.delete(sid);
                mcScoreMap.delete(sid);
                mcTimeMap.delete(sid);
                mcQuestionStartMap.delete(sid);
                io.to(pinCode).emit('game_ended');
                console.log(`[MC] 게임 종료 및 정산: PIN=${pinCode}`);
            } catch (e) {
                console.error('[MC] admin_mc_end 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 🎹 스피드 피아노: 관리자 레벨 전송
        // ──────────────────────────────────────────────────────────
        socket.on('admin_speed_piano_level', async (data) => {
            const { pinCode, level, notes, gameId } = data;
            console.log(`[Speed Piano] 레벨 ${level} 시작: PIN=${pinCode}, 음=${notes.join(',')}`);

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) {
                    console.warn(`[Speed Piano] 세션 없음: PIN=${pinCode}`);
                    return;
                }
                const sessionId = session.id;

                // Speed Piano 세션 맵 초기화
                if (!speedPianoSessionMap.has(sessionId)) {
                    speedPianoScoreMap.set(sessionId, new Map());
                }

                speedPianoSessionMap.set(sessionId, {
                    level,
                    currentNotes: notes,
                    startTime: Date.now()
                });

                console.log(`[Speed Piano] 모든 플레이어에게 레벨 ${level} 전송 (PIN=${pinCode})`);
                // 모든 플레이어에게 현재 음 전송
                io.to(pinCode).emit('speed_piano_level', { level, notes });
            } catch (e) {
                console.error('[Speed Piano] admin_speed_piano_level 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 🎹 스피드 피아노: 플레이어 음 입력
        // ──────────────────────────────────────────────────────────
        socket.on('player_speed_piano_note', async (data) => {
            const { pinCode, level, noteIndex, isCorrect, elapsedMs, totalTime } = data;

            try {
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sessionId = session.id;

                const pid = pInfo.participantId;

                // Speed Piano 점수 맵 초기화
                if (!speedPianoScoreMap.has(sessionId)) {
                    speedPianoScoreMap.set(sessionId, new Map());
                }

                const scoreMap = speedPianoScoreMap.get(sessionId);
                if (!scoreMap.has(pid)) {
                    scoreMap.set(pid, { correctCount: 0, totalAttempts: 0, speed: 0, score: 0 });
                }

                const playerScore = scoreMap.get(pid);
                playerScore.totalAttempts += 1;

                if (isCorrect) {
                    playerScore.correctCount += 1;
                    // 정확도 100점 + 속도 보너스 (최대 50점)
                    const speedBonus = Math.max(0, 50 - (elapsedMs / 100));
                    const gained = Math.round(100 + speedBonus);
                    playerScore.score += gained;
                }

                playerScore.speed = (playerScore.correctCount / totalTime) * 1000;
                scoreMap.set(pid, playerScore);

                // DB에도 업데이트
                const accuracy = playerScore.totalAttempts > 0
                    ? Math.round((playerScore.correctCount / playerScore.totalAttempts) * 100)
                    : 0;

                await Participant.update(
                    { score: playerScore.score },
                    { where: { id: pid } }
                );

                // 관리자에게 실시간 업데이트
                io.to(`admin_${pinCode}`).emit('admin_speed_piano_update', {
                    participantId: pid,
                    correctCount: playerScore.correctCount,
                    totalAttempts: playerScore.totalAttempts,
                    speed: playerScore.speed,
                    score: playerScore.score
                });

                speedPianoScoreMap.set(sessionId, scoreMap);
            } catch (e) {
                console.error('[Speed Piano] player_speed_piano_note 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 🀄 스피드 타일
        // ──────────────────────────────────────────────────────────

        socket.on('admin_start_speed_tile', async (data) => {
            const { pinCode, gameId } = data;
            try {
                // waiting 또는 active 세션 중 가장 최신 세션 조회
                let session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });

                if (!session) {
                    // 세션이 없으면 새로 생성
                    if (gameId) {
                        session = await GameSession.create({
                            game_id: parseInt(gameId),
                            pin_code: pinCode,
                            status: 'active',
                            started_at: new Date()
                        });
                    } else {
                        console.warn(`[Speed Tile] 세션 없음 및 gameId 미전달: PIN=${pinCode}`);
                        return;
                    }
                } else {
                    // 세션을 active 상태로 변경하고 started_at 설정
                    await session.update({
                        status: 'active',
                        started_at: new Date(),
                        ...(gameId ? { game_id: parseInt(gameId) } : {})
                    });
                }

                const sessionId = session.id;

                // 기존 스피드 타일 맵 초기화
                speedTileSessionMap.delete(sessionId);
                speedTileScoreMap.set(sessionId, new Map());

                // 기존 맵 전체에서 이 PIN의 것 정리 (이전 세션 잔재)
                for (const [sid] of speedTileSessionMap.entries()) {
                    if (sid !== sessionId) speedTileSessionMap.delete(sid);
                }

                // 현재 접속 중인 참가자들을 이 세션으로 마이그레이트
                const migrationPromises = [];
                for (const [sid, info] of pinParticipantMap.entries()) {
                    if (info.pinCode !== pinCode) continue;
                    migrationPromises.push((async () => {
                        let p = await Participant.findOne({
                            where: { session_id: sessionId, nickname: info.nickname }
                        });
                        if (!p) {
                            p = await Participant.create({
                                session_id: sessionId,
                                nickname: info.nickname,
                                score: 0,
                                socket_id: sid,
                                joined_at: new Date(),
                                team: info.team || null,
                            });
                        } else {
                            await p.update({ buzzed_at: null, rank: null, score: 0, socket_id: sid });
                        }
                        info.participantId = p.id;
                        pinParticipantMap.set(sid, info);
                    })());
                }
                await Promise.all(migrationPromises);

                console.log(`[Speed Tile] 게임 시작: PIN=${pinCode}, sessionId=${sessionId}`);
                io.to(pinCode).emit('game_started', { sessionId, gameTitle: '스피드 타일', gameType: 'speed_tile' });
                io.to(`admin_${pinCode}`).emit('admin_speed_tile_started', { sessionId });
            } catch (e) {
                console.error('[Speed Tile] start 오류:', e);
            }
        });

        socket.on('admin_speed_tile_next_level', async (data) => {
            const { pinCode, level } = data;
            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                const targetCount = Math.min(3 + (level - 1), 8);
                const gridCount = level >= 4 ? 15 : 10;

                const targetSequence = getRandomSubarray(ANIMAL_EMOJIS, targetCount);
                const remainingEmojis = ANIMAL_EMOJIS.filter(e => !targetSequence.includes(e));
                const padEmojis = getRandomSubarray(remainingEmojis, gridCount - targetCount);
                const gridTiles = getRandomSubarray([...targetSequence, ...padEmojis], gridCount);

                speedTileSessionMap.set(session.id, { level, targetSequence, gridTiles });
                if (!speedTileScoreMap.has(session.id)) {
                    speedTileScoreMap.set(session.id, new Map());
                }

                console.log(`[Speed Tile] 레벨 ${level} 시작: PIN=${pinCode}, Sequence=${targetSequence}`);
                io.to(`admin_${pinCode}`).emit('admin_speed_tile_level', {
                    level, sequence: targetSequence, grid: gridTiles
                });
                io.to(pinCode).emit('speed_tile_level', {
                    level, sequence: targetSequence, grid: gridTiles
                });
            } catch (e) {
                console.error('[Speed Tile] next_level 오류:', e);
            }
        });

        socket.on('player_speed_tile_click', async (data) => {
            const { pinCode, level, noteIndex, isCorrect, elapsedMs, totalTime } = data;
            try {
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;
                const pid = pInfo.participantId;
                if (!pid) {
                    console.warn('[Speed Tile] pid 없음 — 이번 클릭 무시');
                    return;
                }

                // 엔드게임 작업 전에 이미 클릭한 점수는 유지해야하므로 status 조건 제거
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sessionId = session.id;

                if (!speedTileScoreMap.has(sessionId)) speedTileScoreMap.set(sessionId, new Map());
                const scoreMap = speedTileScoreMap.get(sessionId);
                if (!scoreMap.has(pid)) scoreMap.set(pid, { correctCount: 0, totalAttempts: 0, speed: 0, score: 0 });

                const playerScore = scoreMap.get(pid);
                playerScore.totalAttempts += 1;

                if (isCorrect) {
                    playerScore.correctCount += 1;
                    const speedBonus = Math.max(0, 50 - (elapsedMs / 100));
                    playerScore.score += Math.round(100 + speedBonus);
                }

                playerScore.speed = (playerScore.correctCount / Math.max(totalTime, 1)) * 1000;
                scoreMap.set(pid, playerScore);

                console.log(`[Speed Tile] 클릭: pid=${pid}, name=${pInfo.nickname}, sessionId=${sessionId}, score=${playerScore.score}, correct=${playerScore.correctCount}`);

                await Participant.update({ score: playerScore.score }, { where: { id: pid } });

                // 관리자에게 실시간 업데이트
                io.to(`admin_${pinCode}`).emit('admin_speed_tile_update', {
                    participantId: pid,
                    correctCount: playerScore.correctCount,
                    totalAttempts: playerScore.totalAttempts,
                    speed: playerScore.speed,
                    score: playerScore.score
                });
                // 플레이어에게 개별 점수 업데이트
                socket.emit('player_speed_tile_update', {
                    participantId: pid, score: playerScore.score
                });

                speedTileScoreMap.set(sessionId, scoreMap);
            } catch (e) {
                console.error('[Speed Tile] click 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 🎹 스피드 피아노: 게임 종료
        // ──────────────────────────────────────────────────────────
        socket.on('admin_speed_piano_end', async (data) => {
            const { pinCode } = data;
            console.log(`[Speed Piano] 게임 종료: PIN=${pinCode}`);

            try {
                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;
                const sessionId = session.id;

                await session.update({ status: 'finished', ended_at: new Date() });

                // 최종 순위 계산
                const scoreMap = speedPianoScoreMap.get(sessionId) || new Map();
                const leaderboard = [];
                const teamScores = {};
                const processedPids = new Set();

                for (const [, pInfo] of pinParticipantMap.entries()) {
                    if (pInfo.pinCode !== pinCode) continue;
                    const pid = pInfo.participantId;
                    if (!pid || processedPids.has(pid)) continue;
                    processedPids.add(pid);

                    const playerScore = scoreMap.get(pid) || { correctCount: 0, totalAttempts: 0, speed: 0, score: 0 };
                    const entry = {
                        id: pid,
                        name: pInfo.nickname,
                        team: pInfo.team || null,
                        score: playerScore.score,
                        correctCount: playerScore.correctCount,
                        totalAttempts: playerScore.totalAttempts
                    };
                    leaderboard.push(entry);

                    if (pInfo.team) {
                        teamScores[pInfo.team] = (teamScores[pInfo.team] || 0) + playerScore.score;
                    }
                }

                // 점수 높은 순 정렬
                leaderboard.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
                    return 0;
                });
                leaderboard.forEach((p, i) => { p.rank = i + 1; });

                // 팀 순위
                const teamLeaderboard = Object.entries(teamScores)
                    .map(([team, score]) => ({ team, score }))
                    .sort((a, b) => b.score - a.score);

                // 관리자에게 최종 순위 전송
                io.to(`admin_${pinCode}`).emit('admin_ranking_data', { ranking: leaderboard });

                // 플레이어들에게도 순위 전송
                io.to(pinCode).emit('player_ranking_data', { ranking: leaderboard });

                // 정리
                speedPianoSessionMap.delete(sessionId);
                speedPianoScoreMap.delete(sessionId);

                console.log(`[Speed Piano] 게임 정산 완료: PIN=${pinCode}`);
            } catch (e) {
                console.error('[Speed Piano] admin_speed_piano_end 오류:', e);
            }
        });

        // ──────────────────────────────────────────────────────────
        // 🐹 두더지 게임: 플레이어 히트
        // ──────────────────────────────────────────────────────────
        socket.on('player_mole_hit', async (data) => {
            const { pinCode } = data;
            try {
                const pInfo = pinParticipantMap.get(socket.id);
                if (!pInfo) return;

                const session = await GameSession.findOne({
                    where: { pin_code: pinCode, status: 'active' },
                    order: [['id', 'DESC']]
                });
                if (!session) return;

                const pid = pInfo.participantId;

                // Increment score in DB
                await Participant.increment('score', { by: 1, where: { id: pid } });

                // Get updated score
                const participant = await Participant.findByPk(pid);
                const newScore = participant.score;

                // 관리자에게 점수 갱신 전송
                io.to(`admin_${pinCode}`).emit('admin_mole_update', {
                    participantId: pid,
                    score: newScore
                });
            } catch (e) {
                console.error('[Mole] player_mole_hit 오류:', e);
            }
        });

        // ──────────────────────────────────────────────
        // 연결 해제
        // ──────────────────────────────────────────────
        socket.on('disconnect', async () => {
            console.log(`[Socket] 연결 해제: ${socket.id}`);

            // 관리자였다면 맵에서 제거
            if (adminSocketMap.has(socket.id)) {
                const { pinCode } = adminSocketMap.get(socket.id);
                adminSocketMap.delete(socket.id);
                if (pinToAdminSocket.get(pinCode) === socket.id) {
                    pinToAdminSocket.delete(pinCode);
                }

                // 관리자가 끊어지면 3초 후 다른 관리자 소켓이 없으면 참가자 전체 강제 로그아웃
                // (소켓 재연결 시 즉시 kick 방지)
                const kickTimeout = setTimeout(async () => {
                    // 아직 같은 pinCode로 연결된 관리자 소켓이 있는지 확인
                    const hasActiveAdmin = [...adminSocketMap.values()].some(a => a.pinCode === pinCode);
                    if (!hasActiveAdmin) {
                        console.log(`[Socket] 관리자 오프라인 확인 → PIN=${pinCode} 참가자 강제 로그아웃`);
                        io.to(pinCode).emit('force_logout_user');
                        for (const [sid, info] of pinParticipantMap.entries()) {
                            if (info.pinCode === pinCode) {
                                pinParticipantMap.delete(sid);
                            }
                        }
                    }
                }, 3000);
                // 빠른 재연결 감지를 위해 타임아웃 ID를 pinCode에 저장
                if (global._adminKickTimers) {
                    if (global._adminKickTimers[pinCode]) clearTimeout(global._adminKickTimers[pinCode]);
                    global._adminKickTimers[pinCode] = kickTimeout;
                } else {
                    global._adminKickTimers = { [pinCode]: kickTimeout };
                }
            }

            // PIN 참가자였다면 맵에서 제거하고 관리자에게 퇴장 알림
            if (pinParticipantMap.has(socket.id)) {
                const { pinCode } = pinParticipantMap.get(socket.id);
                pinParticipantMap.delete(socket.id);

                const adminRoomKey = `admin_${pinCode}`;
                io.to(adminRoomKey).emit('participant_update', {
                    type: 'leave',
                    socketId: socket.id,
                    pinCode,
                });
                console.log(`[Socket] 참가자 퇴장 관리자 알림: PIN=${pinCode}`);
            }

            // 참가자였다면 socket_id로 찾아 status 업데이트 (선택)
            try {
                const participant = await Participant.findOne({ where: { socket_id: socket.id } });
                if (participant) {
                    // socket_id 초기화 (오프라인 표시)
                    await participant.update({ socket_id: null });
                    console.log(`[Socket] 참가자(${participant.nickname}) 오프라인`);
                }
            } catch (e) { /* 무시 */ }
        });
    });
};
