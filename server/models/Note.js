const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Note = sequelize.define('Note', {
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
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '#fbbf24' // Default yellow post-it color
    },
    x: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    y: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    }
}, {
    tableName: 'notes',
    timestamps: true, // created_at, updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Note;
