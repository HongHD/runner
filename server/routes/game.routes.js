const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Game, Question, Option, GameSession, Participant } = require('../models');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ── 인증 미들웨어 ──
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '토큰이 없습니다.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

router.use(authMiddleware);

// ── 1. 내 게임 목록 조회 ──
router.get('/', async (req, res) => {
    try {
        const { game_type } = req.query;
        const whereClause = { admin_id: req.admin.id };
        if (game_type) {
            whereClause.game_type = game_type;
        }

        const games = await Game.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']]
        });
        res.json(games);
    } catch (err) {
        res.status(500).json({ message: '게임 목록을 불러오지 못했습니다.' });
    }
});

// ── 2. 새 게임 생성 ──
router.post('/', async (req, res) => {
    try {
        const { title, description, game_type } = req.body;
        const newGame = await Game.create({
            admin_id: req.admin.id,
            title,
            description,
            game_type: game_type || 'quiz',
        });
        res.status(201).json(newGame);
    } catch (err) {
        res.status(500).json({ message: '게임 생성에 실패했습니다.' });
    }
});

// ── 3. 특정 게임 상세 조회 ──
router.get('/:id', async (req, res) => {
    try {
        const game = await Game.findOne({
            where: { id: req.params.id, admin_id: req.admin.id },
            include: [{
                model: Question,
                include: [Option],
            }],
            order: [[Question, 'order_num', 'ASC'], [Question, Option, 'id', 'ASC']],
        });
        if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다.' });
        res.json(game);
    } catch (err) {
        res.status(500).json({ message: '게임 정보를 불러오지 못했습니다.' });
    }
});

// ── 3-1. 특정 게임 수정. 질문 및 옵션 포함 ──
router.put('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const game = await Game.findOne({ where: { id: req.params.id, admin_id: req.admin.id } });
        if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다.' });

        const { title, description, game_type, questions } = req.body;

        await game.update({ title, description, game_type }, { transaction: t });

        if (questions && Array.isArray(questions)) {
            // Delete old questions (Options are cascade deleted if constraint set, but we can also rely on it or delete explicitly)
            await Question.destroy({ where: { game_id: game.id }, transaction: t });

            // Re-insert questions
            for (let i = 0; i < questions.length; i++) {
                const qBody = questions[i];
                const newQ = await Question.create({
                    game_id: game.id,
                    order_num: i + 1,
                    question_text: qBody.question_text || '',
                    time_limit: qBody.time_limit || 30,
                    points: qBody.points || 100,
                }, { transaction: t });

                if (qBody.Options && Array.isArray(qBody.Options)) {
                    for (const oBody of qBody.Options) {
                        await Option.create({
                            question_id: newQ.id,
                            option_text: oBody.option_text || '',
                            is_correct: oBody.is_correct || false
                        }, { transaction: t });
                    }
                }
            }
        }
        await t.commit();
        res.json({ message: '게임이 성공적으로 저장되었습니다.' });
    } catch (err) {
        await t.rollback();
        console.error('Update Game error:', err);
        res.status(500).json({ message: '게임 수정에 실패했습니다.' });
    }
});

// ── 4. 게임 삭제 ──
router.delete('/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const game = await Game.findOne({ where: { id: req.params.id, admin_id: req.admin.id } });
        if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다.' });

        // 관련 질문/옵션 삭제 (cascade가 설정되어 있어도 명시적으로 처리)
        const questions = await Question.findAll({ where: { game_id: game.id }, transaction: t });
        for (const q of questions) {
            await Option.destroy({ where: { question_id: q.id }, transaction: t });
        }
        await Question.destroy({ where: { game_id: game.id }, transaction: t });
        await game.destroy({ transaction: t });

        await t.commit();
        res.json({ message: '게임이 삭제되었습니다.' });
    } catch (err) {
        await t.rollback();
        console.error('Delete Game error:', err);
        res.status(500).json({ message: '게임 삭제에 실패했습니다.' });
    }
});

// ── 5. 대시보드 통계 ──
router.get('/admin/stats', async (req, res) => {
    try {
        const adminId = req.admin.id;

        // 내 게임 전체 수
        const totalGames = await Game.count({ where: { admin_id: adminId } });

        // 이번 주 신규 게임
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weeklyGames = await Game.count({
            where: {
                admin_id: adminId,
                created_at: { [Op.gte]: weekStart }
            }
        });

        // 활성 세션 수 (내 게임의 활성 세션)
        const myGames = await Game.findAll({
            where: { admin_id: adminId },
            attributes: ['id']
        });
        const myGameIds = myGames.map(g => g.id);

        let activeSessions = 0;
        let totalSessions = 0;
        let totalParticipants = 0;
        let recentParticipants = [];

        if (myGameIds.length > 0) {
            activeSessions = await GameSession.count({
                where: { game_id: { [Op.in]: myGameIds }, status: 'active' }
            });
            totalSessions = await GameSession.count({
                where: { game_id: { [Op.in]: myGameIds } }
            });

            // 총 참가자 수
            const sessions = await GameSession.findAll({
                where: { game_id: { [Op.in]: myGameIds } },
                attributes: ['id']
            });
            const sessionIds = sessions.map(s => s.id);

            if (sessionIds.length > 0) {
                totalParticipants = await Participant.count({
                    where: { session_id: { [Op.in]: sessionIds } }
                });

                // 최근 접속자 6명
                const recent = await Participant.findAll({
                    where: { session_id: { [Op.in]: sessionIds } },
                    order: [['joined_at', 'DESC']],
                    limit: 6,
                    include: [{ model: GameSession, include: [{ model: Game, attributes: ['title'] }] }]
                });
                recentParticipants = recent.map(p => ({
                    id: p.id,
                    name: p.nickname,
                    gameName: p.GameSession?.Game?.title || '—',
                    joinedAt: p.joined_at,
                    status: 'active'
                }));
            }
        }

        res.json({
            totalGames,
            weeklyGames,
            totalParticipants,
            recentLogins: totalParticipants,  // 편의상 동일 값
            activeSessions,
            totalSessions,
            onlineUsers: totalParticipants,   // 실시간은 socket으로 대체 가능
            recentParticipants
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ message: '통계를 불러오지 못했습니다.' });
    }
});

module.exports = router;
