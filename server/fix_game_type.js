const { sequelize } = require('./config/database');

async function fixGameTypeEnum() {
    try {
        console.log('Fixing game_type ENUM column...');
        
        // MySQL ENUM 변경
        await sequelize.query(`
            ALTER TABLE games 
            MODIFY COLUMN game_type ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano')
            DEFAULT 'quiz'
        `);
        
        console.log('✅ game_type ENUM column fixed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error fixing game_type ENUM:', e.message);
        process.exit(1);
    }
}

fixGameTypeEnum();
