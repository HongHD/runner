const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Answer = sequelize.define('Answer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    participant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    option_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    is_correct: {
        type: DataTypes.BOOLEAN,
    },
    response_time: {
        type: DataTypes.INTEGER,
    },
    points_earned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'answers',
    timestamps: false,
});

module.exports = Answer;
