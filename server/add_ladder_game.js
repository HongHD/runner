// 사다리 게임 game_types DB 추가 스크립트
const { sequelize } = require('./config/database');
const GameType = require('./models/GameType');

async function addLadderGame() {
    await sequelize.authenticate();
    const exists = await GameType.findOne({ where: { name: '사다리 게임' } });
    if (exists) {
        console.log('이미 존재합니다. is_active를 true로 변경합니다.');
        await exists.update({ is_active: true });
    } else {
        await GameType.create({
            category: '랜덤·재미',
            category_icon: '🎲',
            name: '사다리 게임',
            description: '사다리를 타고 내려가는 랜덤 게임. 팀전/개인전 가능',
            badge: 'NEW',
            is_active: true,
            order_num: 100,
        });
        console.log('사다리 게임 game_type이 추가되었습니다.');
    }
    await sequelize.close();
}

addLadderGame().catch(console.error);
