const { sequelize } = require('./server/config/database');

async function alterTable() {
    try {
        await sequelize.query(`
            ALTER TABLE games MODIFY COLUMN game_type ENUM(
                'quiz', 'ox', 'speed', 'survey', 'board', 'mole', 
                'stopwatch', 'multiple_choice', 'button_battle', 
                'speed_piano', 'speed_tile', 'empathy_vote', 
                'word_cloud', 'lucky_draw'
            ) DEFAULT 'quiz';
        `);
        console.log('Successfully updated game_type ENUM');
    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        process.exit(0);
    }
}

alterTable();
