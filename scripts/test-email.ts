import { Resend } from "resend";

// Test email script
// Run with: npx tsx scripts/test-email.ts

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ RESEND_API_KEY not set in environment");
    console.log("Run with: RESEND_API_KEY=your_key npx tsx scripts/test-email.ts");
    process.exit(1);
  }

  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error("❌ No email address provided");
    console.log("Usage: npx tsx scripts/test-email.ts your@email.com");
    process.exit(1);
  }

  console.log(`📧 Sending test email to ${testEmail}...`);

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "iaiaz <admin@iaiaz.com>",
      to: testEmail,
      subject: "Test Email from iaiaz",
      html: `
        <h1>Test Email</h1>
        <p>If you receive this, your Resend configuration is working!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      process.exit(1);
    }

    console.log("✅ Email sent successfully!");
    console.log("   ID:", data?.id);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

testEmail();
