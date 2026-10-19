// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); // 내 PC에서만 .env를 읽고, Cloudtype에선 환경변수를 바로 사용

// 필수 환경변수 누락 시 원인을 바로 알 수 있게 안내
const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`환경변수 누락: ${missing.join(', ')}`);
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: { charset: 'utf8mb4', connectTimeout: 10000 },
    define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// DB가 앱보다 늦게 켜질 때를 대비해 3초 간격으로 최대 5번 재시도
const connectDB = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log(`DB 연결 성공 (${process.env.DB_HOST || '127.0.0.1'}/${process.env.DB_NAME})`);
      return;
    } catch (error) {
      console.error(`DB 연결 실패 ${attempt}/${retries}: ${error.message}`);
      if (attempt === retries) {
        await sequelize.close().catch(() => { });
        process.exit(1);
      }
      await sleep(3000);
    }
  }
};

module.exports = { sequelize, connectDB };