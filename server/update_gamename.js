require('dotenv').config();
const { sequelize } = require('./config/database');
const GameType = require('./models/GameType');

async function updateName() {
    try {
        await sequelize.authenticate();
        console.log('Connected DB');
        const res = await GameType.update({ name: '게시판' }, { where: { name: '마인드보드' } });
        console.log('Update result:', res);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
updateName();
