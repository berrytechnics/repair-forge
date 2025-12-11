// Test SendGrid integration
// Usage: tsx scripts/test-sendgrid.ts [recipient-email]

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function testSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Circuit Sage';
  const replyTo = process.env.SENDGRID_REPLY_TO || fromEmail;

  // Get recipient email from command line argument or use default
  const recipientEmail = process.argv[2] || 'test@example.com';

  // Validate configuration
  if (!apiKey) {
    console.error('❌ Error: SENDGRID_API_KEY is not set in environment variables');
    console.log('\nPlease set SENDGRID_API_KEY in your backend/.env file');
    process.exit(1);
  }

  if (!fromEmail) {
    console.error('❌ Error: SENDGRID_FROM_EMAIL is not set in environment variables');
    console.log('\nPlease set SENDGRID_FROM_EMAIL in your backend/.env file');
    process.exit(1);
  }

  console.log('📧 Testing SendGrid Integration...\n');
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`From: ${fromName} <${fromEmail}>`);
  console.log(`Reply-To: ${replyTo}`);
  console.log(`To: ${recipientEmail}\n`);

  // Set API key
  sgMail.setApiKey(apiKey);

  // Prepare message
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const msg = {
    to: recipientEmail,
    from,
    replyTo,
    subject: 'SendGrid Integration Test - Circuit Sage',
    text: 'This is a test email from Circuit Sage to verify SendGrid integration is working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">SendGrid Integration Test</h2>
        <p>This is a test email from <strong>Circuit Sage</strong> to verify SendGrid integration is working correctly.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Status:</strong> ✅ SendGrid is configured and working!</p>
          <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p>If you received this email, your SendGrid integration is set up correctly.</p>
      </div>
    `,
  };

  try {
    console.log('Sending test email...');
    await sgMail.send(msg);
    console.log('\n✅ Success! Email sent successfully.');
    console.log(`\nCheck the inbox for: ${recipientEmail}`);
    console.log('If you don\'t see it, check your spam folder.');
  } catch (error: unknown) {
    console.error('\n❌ Error sending email:');

    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);

      // Provide helpful error messages
      if (error.message.includes('Unauthorized')) {
        console.error('\n💡 Tip: Your SendGrid API key may be invalid. Please check:');
        console.error('   - Verify the API key in your SendGrid dashboard');
        console.error('   - Ensure the API key has "Mail Send" permissions');
      } else if (error.message.includes('Forbidden')) {
        console.error('\n💡 Tip: Your API key may not have permission to send emails.');
        console.error('   - Check API key permissions in SendGrid dashboard');
      } else if (error.message.includes('from')) {
        console.error('\n💡 Tip: The "from" email address must be verified in SendGrid.');
        console.error(`   - Verify ${fromEmail} in SendGrid dashboard`);
        console.error('   - Or use Single Sender Verification');
      }

      // Log full error details if available
      const errorResponse = (error as { response?: { body?: unknown } }).response;
      if (errorResponse?.body) {
        console.error('\nFull error details:');
        console.error(JSON.stringify(errorResponse.body, null, 2));
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Run the test
testSendGrid().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
