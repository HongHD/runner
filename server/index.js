const os = require('os');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { sequelize, connectDB } = require('./config/database');
const initSocket = require('./socket');
const authRoutes = require('./routes/auth.routes');
const gameRoutes = require('./routes/game.routes');
const gameTypeRoutes = require('./routes/game-type.routes');
const uploadRoutes = require('./routes/upload.routes');
require('./models'); // 모든 모델 로드 및 관계 설정 (sync 전에 반드시 필요)
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS 설정
app.use(cors({
    origin: '*', // 개발 단계에서는 모든 접근 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/game-types', gameTypeRoutes);
app.use('/api/upload', uploadRoutes);

// 정적 파일 제공 (업로드된 이미지/파일 등)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io 초기화
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Socket 이벤트 리스너 설정 모듈 로드
initSocket(io);

// 로직 테스트용 라우트
app.get('/', (req, res) => {
    res.send('QuizN API Server is running');
});

// 서버 실행 및 DB 연결
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    // 네트워크 IP 출력 (휴대폰 접속용)
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`\n=================================================`);
                console.log(`📱 휴대폰 접속 주소: http://${net.address}:5173`);
                console.log(`=================================================\n`);
            }
        }
    }

    await connectDB();
    const BoardPost = require('./models/BoardPost'); // Ensure model is required before sync

    // 강제로 ENUM 컬럼 업데이트 (새 게임 타입 'speed_tile' 추가)
    try {
        await sequelize.query(`
            ALTER TABLE games 
            MODIFY COLUMN game_type ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano', 'speed_tile', 'empathy_vote', 'word_cloud') 
            DEFAULT 'quiz'
        `);
        console.log('[DB] games 테이블 ENUM 업데이트 완료');
    } catch (e) {
        console.log('[DB] ENUM 업데이트 건너뜀 (이미 업데이트 되었거나 필드가 없을 수 있음)');
    }

    // 최초 실행 시 테이블이 없다면 자동 생성 (주의: sync()는 production에서 주의)
    await sequelize.sync({ force: false });
    try {
        // ENUM 변경사항 자동 반영을 위한 수동 쿼리 (Sequelize 기본 sync는 ENUM을 잘 변경하지 못함)
        await sequelize.query("ALTER TABLE games MODIFY COLUMN game_type ENUM('quiz', 'ox', 'speed', 'survey', 'board', 'mole', 'stopwatch', 'multiple_choice', 'button_battle', 'speed_piano', 'speed_tile', 'empathy_vote', 'word_cloud') DEFAULT 'quiz'");
    } catch (e) {
        console.log('ALTER TABLE 쿼리 무시 (이미 적용되어 있거나 SQLite 환경일 수 있음)');
    }
    console.log('Database synced');
});

// 포트 충돌 시 에러 처리
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ 에러: 포트 ${PORT}가 이미 사용 중입니다.`);
        console.error(`💡 해결방법:`);
        console.error(`   1. 터미널에서: netstat -ano | findstr :${PORT}`);
        console.error(`   2. PID를 확인 후: taskkill /PID <PID> /F`);
        console.error(`   3. 또는 .env 파일의 PORT 값을 변경하세요.\n`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
