// Test script for Formspree Sync Integration
// Run this after starting your server to test the sync endpoints

const testFormspreeSync = async () => {
  console.log('🧪 Testing Formspree Sync Integration...\n');

  try {
    // Test 1: Health check with sync status
    console.log('1️⃣ Testing server health and sync status...');
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server is healthy:', health);
      
      if (health.formspreeSync) {
        console.log('✅ Formspree sync service is available');
        console.log('📊 Sync status:', health.formspreeSync);
      } else {
        console.log('⚠️ Formspree sync service not available');
      }
    } else {
      throw new Error('Server health check failed');
    }

    // Test 2: Formspree sync status
    console.log('\n2️⃣ Testing Formspree sync status endpoint...');
    const statusResponse = await fetch('http://localhost:3001/api/formspree/status');
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Sync status retrieved:', status);
    } else {
      const error = await statusResponse.text();
      console.log('⚠️ Sync status check failed:', error);
    }

    // Test 3: Manual sync trigger
    console.log('\n3️⃣ Testing manual sync trigger...');
    const syncResponse = await fetch('http://localhost:3001/api/formspree/sync', {
      method: 'POST'
    });
    if (syncResponse.ok) {
      const result = await syncResponse.json();
      console.log('✅ Manual sync triggered:', result);
    } else {
      const error = await syncResponse.text();
      console.log('⚠️ Manual sync failed:', error);
    }

    // Test 4: Start sync service
    console.log('\n4️⃣ Testing sync service start...');
    const startResponse = await fetch('http://localhost:3001/api/formspree/start', {
      method: 'POST'
    });
    if (startResponse.ok) {
      const result = await startResponse.json();
      console.log('✅ Sync service started:', result);
    } else {
      const error = await startResponse.text();
      console.log('⚠️ Failed to start sync service:', error);
    }

    // Test 5: Get all requests
    console.log('\n5️⃣ Testing requests endpoint...');
    const requestsResponse = await fetch('http://localhost:3001/api/requests');
    if (requestsResponse.ok) {
      const requests = await requestsResponse.json();
      console.log('✅ Retrieved requests:', requests.length);
      if (requests.length > 0) {
        console.log('📋 Latest request:', requests[0]);
      }
    } else {
      throw new Error('Failed to retrieve requests');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Open shopify_request_form.html and submit a test form');
    console.log('2. Wait up to 2 minutes for automatic sync');
    console.log('3. Check your admin interface for the new request');
    console.log('4. Open server/formspree-monitor.html to monitor sync status');
    console.log('5. Check server console for sync activity logs');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your server is running (npm run server)');
    console.log('2. Check your environment variables (.env file)');
    console.log('3. Verify Supabase credentials and permissions');
    console.log('4. Check server console for error messages');
    console.log('5. Ensure Formspree form ID is correct in formspree-sync.js');
  }
};

// Test form submission simulation
const testFormSubmission = async () => {
  console.log('\n🧪 Testing form submission simulation...\n');

  try {
    // Simulate a form submission to Formspree
    const formData = new FormData();
    formData.append('name', 'Test User - Sync Test');
    formData.append('email', 'sync-test@example.com');
    formData.append('phone', '+1234567890');
    formData.append('comment', 'This is a test submission to verify the sync system is working.');

    console.log('📝 Submitting test form to Formspree...');
    const formspreeResponse = await fetch('https://formspree.io/f/xzzvydeg', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (formspreeResponse.ok) {
      console.log('✅ Test form submitted to Formspree successfully');
      console.log('🔄 This submission will be automatically synced to your database within 2 minutes');
      console.log('📊 Check the monitor interface to see the sync process');
    } else {
      throw new Error('Formspree submission failed');
    }

  } catch (error) {
    console.error('❌ Form submission test failed:', error.message);
  }
};

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testFormspreeSync().then(() => {
    testFormSubmission();
  });
} else {
  // Browser environment
  console.log('🌐 Running in browser - use the form to test submission');
  console.log('📱 Open shopify_request_form.html in your browser');
  console.log('📊 Open server/formspree-monitor.html to monitor sync status');
}

module.exports = { testFormspreeSync, testFormSubmission };
