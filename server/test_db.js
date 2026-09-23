require('dotenv').config();
const { sequelize, Admin } = require('./models');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected');
        const existingAdmin = await Admin.findOne({ where: { email: 'test@example.com' } });
        console.log('Query result:', existingAdmin);
    } catch (err) {
        console.error('DB ERROR:', err);
    } finally {
        process.exit();
    }
}
test();
