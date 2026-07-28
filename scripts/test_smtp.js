const nodemailer = require('nodemailer');

const testConfigs = [
  { name: 'Hostinger SSL 465', host: 'smtp.hostinger.com', port: 465, secure: true },
  { name: 'Hostinger TLS 587', host: 'smtp.hostinger.com', port: 587, secure: false },
  { name: 'Titan SSL 465', host: 'smtp.titan.email', port: 465, secure: true },
  { name: 'Titan TLS 587', host: 'smtp.titan.email', port: 587, secure: false },
  { name: 'Localhost 25', host: 'localhost', port: 25, secure: false }
];

async function runDiagnostic() {
  const user = 'info@zakariaprom.com';
  const pass = 'Sy2242368';

  console.log(`Starting SMTP diagnostics for ${user}...`);

  for (const cfg of testConfigs) {
    console.log(`\n--- Testing ${cfg.name} (${cfg.host}:${cfg.port}) ---`);
    const options = {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    };

    if (cfg.host !== 'localhost') {
      options.auth = { user, pass };
    }

    const transporter = nodemailer.createTransport(options);

    try {
      await transporter.verify();
      console.log(`✅ SUCCESS: ${cfg.name} verified successfully!`);

      // Try sending a test email
      const info = await transporter.sendMail({
        from: `"Zakaria Prom Test" <${user}>`,
        to: user,
        subject: `SMTP Test Success - ${cfg.name}`,
        text: `Diagnostic test from ${cfg.name} at ${new Date().toISOString()}`
      });
      console.log(`📩 EMAIL SENT! Message ID: ${info.messageId}`);
      return { success: true, config: cfg };
    } catch (err) {
      console.error(`❌ FAILED: ${cfg.name} -> ${err.message}`);
    }
  }

  console.log('\nAll direct SMTP connections failed.');
}

runDiagnostic();
