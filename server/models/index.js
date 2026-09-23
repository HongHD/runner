const { sequelize } = require('../config/database');
const Admin = require('./Admin');
const Game = require('./Game');
const Question = require('./Question');
const Option = require('./Option');
const GameSession = require('./GameSession');
const Participant = require('./Participant');
const Answer = require('./Answer');
const GameType = require('./GameType');
const AdminGameTypeSetting = require('./AdminGameTypeSetting');
const Note = require('./Note');
const BoardPost = require('./BoardPost');

// Admin <-> Game (1:N)
Admin.hasMany(Game, { foreignKey: 'admin_id' });
Game.belongsTo(Admin, { foreignKey: 'admin_id' });

// Admin <-> AdminGameTypeSetting (1:N)
Admin.hasMany(AdminGameTypeSetting, { foreignKey: 'admin_id' });
AdminGameTypeSetting.belongsTo(Admin, { foreignKey: 'admin_id' });

// GameType <-> AdminGameTypeSetting (1:N)
GameType.hasMany(AdminGameTypeSetting, { foreignKey: 'game_type_id' });
AdminGameTypeSetting.belongsTo(GameType, { foreignKey: 'game_type_id' });

// Game <-> Question (1:N)
Game.hasMany(Question, { foreignKey: 'game_id', onDelete: 'CASCADE' });
Question.belongsTo(Game, { foreignKey: 'game_id' });

// Question <-> Option (1:N)
Question.hasMany(Option, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Option.belongsTo(Question, { foreignKey: 'question_id' });

// Game <-> GameSession (1:N)
Game.hasMany(GameSession, { foreignKey: 'game_id' });
GameSession.belongsTo(Game, { foreignKey: 'game_id' });

// GameSession <-> Participant (1:N)
GameSession.hasMany(Participant, { foreignKey: 'session_id' });
Participant.belongsTo(GameSession, { foreignKey: 'session_id' });

// Participant <-> Answer (1:N)
Participant.hasMany(Answer, { foreignKey: 'participant_id' });
Answer.belongsTo(Participant, { foreignKey: 'participant_id' });

// Question <-> Answer (1:N)
Question.hasMany(Answer, { foreignKey: 'question_id' });
Answer.belongsTo(Question, { foreignKey: 'question_id' });

// GameSession <-> Note (1:N)
GameSession.hasMany(Note, { foreignKey: 'session_id', onDelete: 'CASCADE' });
Note.belongsTo(GameSession, { foreignKey: 'session_id' });

// Participant <-> Note (1:N)
Participant.hasMany(Note, { foreignKey: 'participant_id', onDelete: 'SET NULL' });
Note.belongsTo(Participant, { foreignKey: 'participant_id' });

// GameSession <-> BoardPost (1:N)
GameSession.hasMany(BoardPost, { foreignKey: 'session_id', onDelete: 'CASCADE' });
BoardPost.belongsTo(GameSession, { foreignKey: 'session_id' });

// Participant <-> BoardPost (1:N)
Participant.hasMany(BoardPost, { foreignKey: 'participant_id', onDelete: 'SET NULL' });
BoardPost.belongsTo(Participant, { foreignKey: 'participant_id' });

module.exports = {
    sequelize,
    Admin,
    Game,
    Question,
    Option,
    GameSession,
    Participant,
    Answer,
    GameType,
    AdminGameTypeSetting,
    Note,
    BoardPost
};
