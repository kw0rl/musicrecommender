// test_email.js - Test email configuration
require('dotenv').config();
const { testEmailConnection, sendPasswordResetEmail } = require('./services/emailService');

async function testEmail() {
    console.log('🔧 Testing email configuration...');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    
    // Test connection
    const connectionTest = await testEmailConnection();
    
    if (connectionTest.success) {
        console.log('\n✅ Email connection successful!');
        
        // Ask if user wants to send test email
        console.log('\n📧 Would you like to send a test email?');
        console.log('Edit this script to add your test email and run again.');
        
        // Uncomment and modify the line below to test sending
        // const testResult = await sendPasswordResetEmail('your-test-email@gmail.com', 'test123', 'TestUser');
        // console.log('Test email result:', testResult);
        
    } else {
        console.log('\n❌ Email connection failed:', connectionTest.error);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Verify your Gmail app password is correct');
        console.log('2. Make sure 2-factor authentication is enabled');
        console.log('3. Check if "Less secure app access" is disabled (should be)');
        console.log('4. Try generating a new app password');
    }
}

testEmail().catch(console.error);
