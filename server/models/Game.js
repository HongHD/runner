const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    game_type: {
        type: DataTypes.ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano', 'speed_tile', 'empathy_vote', 'word_cloud', 'lucky_draw'),
        defaultValue: 'quiz',
    },
    pin_code: {
        type: DataTypes.STRING(10),
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'finished'),
        defaultValue: 'draft',
    },
    settings: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    tableName: 'games',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = Game;
