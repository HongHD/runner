require('dotenv').config();
const { sequelize } = require('./models');

async function addPinCode() {
    try {
        await sequelize.query("ALTER TABLE admins ADD COLUMN pin_code VARCHAR(6) NULL;");

        // 이전에 가입된 유저들을 위해 임의의 핀 부여
        const [admins] = await sequelize.query("SELECT id FROM admins");
        for (let admin of admins) {
            const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
            await sequelize.query(`UPDATE admins SET pin_code = '${randomPin}' WHERE id = ${admin.id}`);
        }
        console.log("pin_code column added successfully");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
addPinCode();
