const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Participant = sequelize.define('Participant', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    nickname: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    socket_id: {
        type: DataTypes.STRING(255),
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    buzzed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    elapsed_ms: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: '부저 클릭 경과 시간(밀리쳐8)',
    },
    team: {
        type: DataTypes.STRING(30),
        allowNull: true,
    },
}, {
    tableName: 'participants',
    timestamps: false,
});

module.exports = Participant;
