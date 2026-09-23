const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminGameTypeSetting = sequelize.define('AdminGameTypeSetting', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    game_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'admin_game_type_settings',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['admin_id', 'game_type_id'] }
    ]
});

module.exports = AdminGameTypeSetting;
