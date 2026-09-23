require('dotenv').config();
const { sequelize } = require('./models');

async function fixCharset() {
    try {
        await sequelize.authenticate();

        // DB 자체 인코딩 변경
        await sequelize.query('ALTER DATABASE `ver1-1` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');

        // 모든 테이블 순회 및 인코딩 변경
        const tables = ['admins', 'games', 'questions', 'options', 'game_sessions', 'participants', 'answers'];
        for (const table of tables) {
            await sequelize.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
            console.log(`Updated ${table} charset`);
        }
        console.log('Charset fixed successfully.');
    } catch (err) {
        console.error('Error fixing charset:', err);
    } finally {
        process.exit();
    }
}

fixCharset();
