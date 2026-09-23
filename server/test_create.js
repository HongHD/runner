require('dotenv').config();
const { sequelize, Admin } = require('./models');

async function test() {
    try {
        await Admin.create({ name: '홍희대', email: 'hhd77@hanmail.net', password: '1111' });
        console.log('Created successfully');
    } catch (err) {
        console.error('DB ERROR:', err.message, err.name);
    } finally {
        process.exit();
    }
}
test();
