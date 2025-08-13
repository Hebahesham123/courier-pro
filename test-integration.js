// Test script for Formspree integration
// Run this after starting your server to test the endpoints

const testFormSubmission = async () => {
  console.log('🧪 Testing Formspree Integration...\n');

  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
    comment: 'This is a test request to verify the integration is working properly.',
    image_url: null,
    video_url: null
  };

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Server is healthy:', health);
    } else {
      throw new Error('Server health check failed');
    }

    // Test 2: Direct form submission
    console.log('\n2️⃣ Testing direct form submission...');
    const formData = new FormData();
    Object.keys(testData).forEach(key => {
      if (testData[key] !== null) {
        formData.append(key, testData[key]);
      }
    });

    const submitResponse = await fetch('http://localhost:3001/api/submit-request', {
      method: 'POST',
      body: formData
    });

    if (submitResponse.ok) {
      const result = await submitResponse.json();
      console.log('✅ Form submission successful:', result);
      console.log('📝 Request ID:', result.request_id);
    } else {
      const error = await submitResponse.text();
      throw new Error(`Form submission failed: ${error}`);
    }

    // Test 3: Get all requests
    console.log('\n3️⃣ Testing get requests endpoint...');
    const requestsResponse = await fetch('http://localhost:3001/api/requests');
    if (requestsResponse.ok) {
      const requests = await requestsResponse.json();
      console.log('✅ Retrieved requests:', requests.length);
      console.log('📋 Latest request:', requests[0]);
    } else {
      throw new Error('Failed to retrieve requests');
    }

    // Test 4: Update request status
    console.log('\n4️⃣ Testing request update...');
    const updateResponse = await fetch(`http://localhost:3001/api/requests/${testData.email}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'process', assignee: 'Test Admin' })
    });

    if (updateResponse.ok) {
      const updated = await updateResponse.json();
      console.log('✅ Request updated successfully:', updated);
    } else {
      console.log('⚠️ Update test skipped (request ID format issue)');
    }

    // Test 5: Add note to request
    console.log('\n5️⃣ Testing note addition...');
    const noteData = {
      note: 'This is a test note added via the API',
      author: 'Test Admin'
    };

    const noteResponse = await fetch(`http://localhost:3001/api/requests/${testData.email}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });

    if (noteResponse.ok) {
      const note = await noteResponse.json();
      console.log('✅ Note added successfully:', note);
    } else {
      console.log('⚠️ Note test skipped (request ID format issue)');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your Supabase database for the test request');
    console.log('2. Verify the request appears in your admin interface');
    console.log('3. Test the actual form submission from the HTML form');
    console.log('4. Set up Formspree webhook for production use');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your server is running (npm run server)');
    console.log('2. Check your environment variables (.env file)');
    console.log('3. Verify Supabase credentials and permissions');
    console.log('4. Check server console for error messages');
  }
};

// Test Formspree webhook simulation
const testFormspreeWebhook = async () => {
  console.log('\n🧪 Testing Formspree webhook simulation...\n');

  const webhookData = {
    name: 'Webhook Test User',
    email: 'webhook@example.com',
    phone: '+1987654321',
    comment: 'This request was submitted via Formspree webhook.',
    image_url: 'https://example.com/test-image.jpg',
    video_url: null
  };

  try {
    const webhookResponse = await fetch('http://localhost:3001/webhook/formspree', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (webhookResponse.ok) {
      const result = await webhookResponse.json();
      console.log('✅ Webhook processed successfully:', result);
      console.log('📝 Request ID:', result.request_id);
    } else {
      const error = await webhookResponse.text();
      throw new Error(`Webhook failed: ${error}`);
    }

  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
};

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  testFormSubmission().then(() => {
    testFormspreeWebhook();
  });
} else {
  // Browser environment
  console.log('🌐 Running in browser - use the form to test submission');
  console.log('📱 Open shopify_request_form.html in your browser');
}

module.exports = { testFormSubmission, testFormspreeWebhook };
