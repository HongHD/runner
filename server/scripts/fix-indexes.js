/**
 * fix-indexes.js
 * 각 테이블에서 중복된 외래키 인덱스를 정리하는 스크립트
 * 실행: node server/scripts/fix-indexes.js
 */
const { sequelize } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function fixIndexes() {
    try {
        await sequelize.authenticate();
        console.log('DB 연결 성공');

        // 데이터베이스 이름 가져오기
        const [dbResult] = await sequelize.query('SELECT DATABASE() as db');
        const dbName = dbResult[0].db;
        console.log(`데이터베이스: ${dbName}`);

        // 각 테이블의 인덱스 조회
        const tables = ['answers', 'board_posts', 'notes', 'participants', 'game_sessions', 'options', 'questions', 'games', 'admins', 'game_types', 'admin_game_type_settings'];

        for (const table of tables) {
            try {
                const [indexes] = await sequelize.query(
                    `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE 
                     FROM information_schema.STATISTICS 
                     WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = '${table}'
                     ORDER BY INDEX_NAME, SEQ_IN_INDEX`
                );

                // PRIMARY와 중복된 FK 인덱스 찾기
                const indexMap = {};
                for (const row of indexes) {
                    if (row.INDEX_NAME === 'PRIMARY') continue;
                    if (!indexMap[row.INDEX_NAME]) indexMap[row.INDEX_NAME] = [];
                    indexMap[row.INDEX_NAME].push(row.COLUMN_NAME);
                }

                // 같은 컬럼을 가리키는 중복 인덱스 탐지 및 제거
                const columnToIndexes = {};
                for (const [indexName, cols] of Object.entries(indexMap)) {
                    const key = cols.sort().join(',');
                    if (!columnToIndexes[key]) columnToIndexes[key] = [];
                    columnToIndexes[key].push(indexName);
                }

                for (const [colKey, indexNames] of Object.entries(columnToIndexes)) {
                    if (indexNames.length > 1) {
                        // 첫 번째 인덱스만 남기고 나머지 삭제
                        const toDelete = indexNames.slice(1);
                        for (const idxName of toDelete) {
                            try {
                                await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idxName}\``);
                                console.log(`[${table}] 중복 인덱스 삭제: ${idxName} (컬럼: ${colKey})`);
                            } catch (e) {
                                // FK 제약에 걸려 있을 수 있음 - 무시
                                console.log(`[${table}] 인덱스 삭제 실패 (무시): ${idxName} - ${e.message}`);
                            }
                        }
                    }
                }
            } catch (e) {
                // 테이블이 없을 경우 무시
            }
        }

        console.log('\n✅ 인덱스 정리 완료!');
        process.exit(0);
    } catch (err) {
        console.error('오류:', err.message);
        process.exit(1);
    }
}

fixIndexes();
