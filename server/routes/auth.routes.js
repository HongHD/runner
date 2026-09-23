const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 이메일 중복 확인
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) {
            return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
        }

        // 비밀번호 해싱
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 랜덤 PIN 생성
        const pinCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newAdmin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            pin_code: pinCode
        });

        res.status(201).json({ message: '회원가입이 완료되었습니다.', adminId: newAdmin.id, pinCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        // 로그인 시마다 새로운 랜덤 PIN 생성 및 저장
        const newPinCode = Math.floor(100000 + Math.random() * 900000).toString();
        admin.pin_code = newPinCode;
        await admin.save();

        const token = jwt.sign(
            { id: admin.id, email: admin.email, name: admin.name },
            process.env.JWT_SECRET || 'your_super_secret_jwt_key',
            { expiresIn: '24h' }
        );

        res.json({
            message: '로그인 성공',
            token,
            admin: { id: admin.id, name: admin.name, email: admin.email, pinCode: admin.pin_code }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

module.exports = router;
