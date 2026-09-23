require('dotenv').config();
const { sequelize } = require('./config/database');
const GameType = require('./models/GameType');
const GAME_TYPES_SEED = require('./data/gameTypes.seed');

async function resetGameTypes() {
    try {
        await sequelize.authenticate();
        console.log('DB에 연결되었습니다.');

        // 테이블 비우기 (AUTO_INCREMENT 초기화는 TRUNCATE)
        await GameType.destroy({ truncate: true, restartIdentity: true });
        console.log('기존 GameType 데이터를 삭제했습니다.');

        // 시드 데이터 삽입
        await GameType.bulkCreate(GAME_TYPES_SEED);
        console.log(`새로운 시드 데이터 ${GAME_TYPES_SEED.length}개를 추가했습니다.`);

        process.exit(0);
    } catch (err) {
        console.error('초기화 중 오류 발생:', err);
        process.exit(1);
    }
}

resetGameTypes();
