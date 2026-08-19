require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const { POST } = require('../src/app/api/orders/sync/route.js');
    const req = {
      url: 'http://localhost/api/orders/sync',
    };
    
    console.log('Running route handler...');
    const res = await POST(req);
    console.log('Status:', res.status);
    
    // next NextResponse has json() method? No, it's a standard web Response
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('CRASH:', err);
  }
}

run();
