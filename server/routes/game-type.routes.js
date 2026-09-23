const express = require('express');
const jwt = require('jsonwebtoken');
const GameType = require('../models/GameType');
const { AdminGameTypeSetting } = require('../models');
const GAME_TYPES_SEED = require('../data/gameTypes.seed');

const router = express.Router();

// ── 인증 미들웨어 ──
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '토큰이 없습니다.' });
    try {
        req.admin = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
        next();
    } catch {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

router.use(authMiddleware);

// ── 1. 관리자별 게임 종류 목록 조회 ──
router.get('/', async (req, res) => {
    try {
        const adminId = req.admin.id;

        // 시드 데이터 자동 삽입
        let types = await GameType.findAll({ order: [['category', 'ASC'], ['order_num', 'ASC']] });
        if (types.length === 0) {
            await GameType.bulkCreate(GAME_TYPES_SEED);
            types = await GameType.findAll({ order: [['category', 'ASC'], ['order_num', 'ASC']] });
        }

        // 이 관리자의 개인 설정 로드
        const mySettings = await AdminGameTypeSetting.findAll({ where: { admin_id: adminId } });
        const settingMap = {};
        mySettings.forEach(s => { settingMap[s.game_type_id] = s.is_active; });

        // 개인 is_active 값으로 오버라이드
        const result = types.map(t => ({
            ...t.toJSON(),
            is_active: settingMap[t.id] !== undefined ? settingMap[t.id] : false
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '게임 종류 목록을 불러오지 못했습니다.' });
    }
});

// ── 2. 사용 여부 일괄 업데이트 (관리자별 저장) ──
// body: { updates: [{ id, is_active }] }
router.put('/bulk', async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: '업데이트 데이터가 없습니다.' });
        }

        // 관리자별 upsert
        await Promise.all(
            updates.map(({ id, is_active }) =>
                AdminGameTypeSetting.upsert({ admin_id: adminId, game_type_id: id, is_active })
            )
        );

        // 업데이트된 목록 반환 (이 관리자 기준)
        const types = await GameType.findAll({ order: [['category', 'ASC'], ['order_num', 'ASC']] });
        const mySettings = await AdminGameTypeSetting.findAll({ where: { admin_id: adminId } });
        const settingMap = {};
        mySettings.forEach(s => { settingMap[s.game_type_id] = s.is_active; });

        const result = types.map(t => ({
            ...t.toJSON(),
            is_active: settingMap[t.id] !== undefined ? settingMap[t.id] : false
        }));

        res.json({ message: '저장되었습니다.', types: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '저장에 실패했습니다.' });
    }
});

// ── 3. 단건 토글 (관리자별) ──
router.patch('/:id', async (req, res) => {
    try {
        const adminId = req.admin.id;
        const { is_active } = req.body;
        await AdminGameTypeSetting.upsert({
            admin_id: adminId,
            game_type_id: parseInt(req.params.id),
            is_active
        });
        const updated = await GameType.findByPk(req.params.id);
        res.json({ ...updated.toJSON(), is_active });
    } catch (err) {
        res.status(500).json({ message: '업데이트에 실패했습니다.' });
    }
});

module.exports = router;
