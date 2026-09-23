const axios = require('axios');

async function testApi() {
    try {
        const res = await axios.post('http://localhost:5001/api/auth/register', {
            name: 'api_test',
            email: 'api@test.com',
            password: '123'
        });
        console.log('SUCCESS:', res.data);
    } catch (err) {
        console.error('API ERROR:', err.response ? err.response.data : err.message);
    }
}

testApi();
