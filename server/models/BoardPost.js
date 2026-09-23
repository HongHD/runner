const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BoardPost = sequelize.define('BoardPost', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    session_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    participant_id: {
        type: DataTypes.INTEGER,
        allowNull: true // admin can theoretically post? Actually mostly participants
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    image_url: {
        type: DataTypes.STRING(1024),
        allowNull: true
    },
    attachment_url: {
        type: DataTypes.STRING(1024),
        allowNull: true
    },
    attachment_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'board_posts',
    timestamps: true, // created_at, updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = BoardPost;
