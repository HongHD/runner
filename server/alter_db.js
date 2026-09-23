require('dotenv').config();
const { sequelize } = require('./config/database');

async function alterTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Altering games table...');

        // 1. Modify game_type ENUM
        await sequelize.query(`
            ALTER TABLE games 
            MODIFY COLUMN game_type ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle') 
            DEFAULT 'quiz'
        `);
        console.log('game_type column modified successfully.');

        // 2. Add settings column if it doesn't exist
        try {
            await sequelize.query(`ALTER TABLE games ADD COLUMN settings JSON NULL`);
            console.log('settings column added successfully.');
        } catch (err) {
            if (err.message.includes('Duplicate column name')) {
                console.log('settings column already exists.');
            } else {
                throw err;
            }
        }
    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        await sequelize.close();
    }
}

alterTable();
