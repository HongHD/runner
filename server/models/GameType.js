const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GameType = sequelize.define('GameType', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '게임 카테고리 (예: 퀴즈·경쟁, 투표·소통, 랜덤·재미)',
    },
    category_icon: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '카테고리 아이콘 이모지',
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '게임 이름',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '게임 설명',
    },
    badge: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'NEW, HOT, BETA 등 뱃지',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '사용 여부 (활성화)',
    },
    order_num: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '카테고리 내 정렬 순서',
    },
}, {
    tableName: 'game_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = GameType;
