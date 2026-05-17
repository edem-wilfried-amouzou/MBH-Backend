const axios = require('axios');

async function diagnose() {
  const baseURL = 'https://mbh-backend.onrender.com/api';
  console.log('--- 1. Testing Login ---');
  try {
    const loginRes = await axios.post(`${baseURL}/admin/login`, {
      email: 'admin@agrilogix.com',
      password: 'Admin@2026!'
    });
    console.log('Login Success!');
    console.log('Response Status:', loginRes.status);
    console.log('Response Data:', loginRes.data);

    const token = loginRes.data.token;
    console.log('\n--- 2. Testing Stats with Token ---');
    try {
      const statsRes = await axios.get(`${baseURL}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Stats Success!');
      console.log('Stats Data:', statsRes.data);
    } catch (err) {
      console.log('Stats Failed!');
      if (err.response) {
        console.log('Status Code:', err.response.status);
        console.log('Response Headers:', err.response.headers);
        console.log('Response Data:', err.response.data);
      } else {
        console.log('Error Message:', err.message);
      }
    }

  } catch (err) {
    console.log('Login Failed!');
    if (err.response) {
      console.log('Status Code:', err.response.status);
      console.log('Response Data:', err.response.data);
    } else {
      console.log('Error Message:', err.message);
    }
  }
}

diagnose();
