const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    order_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    image_url: {
        type: DataTypes.STRING(500),
    },
    time_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
}, {
    tableName: 'questions',
    timestamps: false,
});

module.exports = Question;
