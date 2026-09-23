const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GameSession = sequelize.define('GameSession', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    pin_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '관리자 PIN 코드 (입장 시 사용)'
    },
    status: {
        type: DataTypes.ENUM('waiting', 'active', 'finished'),
        defaultValue: 'waiting',
    },
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'game_sessions',
    timestamps: false,
});

module.exports = GameSession;
