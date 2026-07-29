const nodemailer = require('nodemailer');

// Persistent Pooled Transporter (Reuses TLS socket to prevent Hostinger rate-limit/re-auth blocks)
let poolTransporter = null;

function getPooledTransporter(host = 'smtp.hostinger.com', port = 465, secure = true) {
  if (poolTransporter) return poolTransporter;

  poolTransporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: 5, // 5 messages per second max
    host: process.env.SMTP_HOST || host,
    port: parseInt(process.env.SMTP_PORT || String(port)),
    secure,
    auth: {
      user: process.env.SMTP_USER || 'info@zakariaprom.com',
      pass: process.env.SMTP_PASS || 'Sy2242368.'
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  return poolTransporter;
}

/**
 * Clean & sanitize UTF-8 string input
 */
function toCleanUtf8(str) {
  if (!str) return '';
  try {
    return String(str).trim();
  } catch (e) {
    return String(str);
  }
}

/**
 * Send Contact / Quote Request Email to Admin & Confirmation to Customer (Bilingual AR + EN)
 */
async function sendContactEmail({ name, email, phone, message, subject, lang = 'ar' }) {
  const adminRecipient = 'info@zakariaprom.com';
  const cleanName = toCleanUtf8(name) || 'عميل / Customer';
  const cleanEmail = toCleanUtf8(email);
  const cleanPhone = toCleanUtf8(phone) || 'غير محدد / Not specified';
  const cleanMessage = toCleanUtf8(message);
  const emailSubject = subject ? toCleanUtf8(subject) : `طلب عرض سعر جديد | New Quote Request: ${cleanName}`;

  // 1. Bilingual Admin HTML Body (With explicit UTF-8 META headers)
  const adminHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طلب عرض سعر جديد</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; background-color: #f4f7f6; color: #333333;">
  <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background-color: #0e4a6f; padding: 24px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff;">📩 طلب عرض سعر / رسالة جديدة</h2>
      <h3 style="margin: 6px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: normal; color: #ffffff;">New Quote & Contact Request</h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.75; color: #ffffff;">مكتبة زكريا - zakariaprom.com</p>
    </div>
    
    <!-- Content Body -->
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px; font-weight: bold; width: 35%; color: #0e4a6f;" dir="rtl">👤 الاسم / Name:</td>
          <td style="padding: 10px; color: #333333;">${cleanName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px; font-weight: bold; color: #0e4a6f;" dir="rtl">✉️ البريد الإلكتروني / Email:</td>
          <td style="padding: 10px; color: #333333;"><a href="mailto:${cleanEmail}" style="color: #00a8a8; text-decoration: none;">${cleanEmail}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px; font-weight: bold; color: #0e4a6f;" dir="rtl">📞 رقم الهاتف / Phone:</td>
          <td style="padding: 10px; color: #333333;" dir="ltr">${cleanPhone}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eeeeee;">
          <td style="padding: 10px; font-weight: bold; color: #0e4a6f;" dir="rtl">📅 التاريخ / Date:</td>
          <td style="padding: 10px; color: #333333;">${new Date().toLocaleString('ar-SA')} | ${new Date().toUTCString()}</td>
        </tr>
      </table>

      <!-- Message Box -->
      <div style="background-color: #f8fafc; border-right: 4px solid #00a8a8; border-left: 4px solid #00a8a8; padding: 16px; border-radius: 8px; margin-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #0e4a6f;" dir="rtl">💬 تفاصيل الرسالة / Message Details:</h4>
        <p style="margin: 0; color: #333333; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${cleanMessage}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
      تم إرسال هذه الرسالة تلقائياً من موقع مكتبة زكريا | Automatically generated from zakariaprom.com
    </div>
  </div>
</body>
</html>`;

  // 2. Bilingual Customer Confirmation HTML (With explicit UTF-8 META headers)
  const customerHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم استلام طلبك بنجاح</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; background-color: #f4f7f6; color: #333333;">
  <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background-color: #0e4a6f; padding: 24px; text-align: center; color: #ffffff;">
      <h2 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff;">شكراً لتواصلك مع مكتبة زكريا</h2>
      <h3 style="margin: 6px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: normal; color: #ffffff;">Thank you for contacting Zakaria Prom</h3>
    </div>

    <!-- Body -->
    <div style="padding: 24px; color: #333333; line-height: 1.7; font-size: 15px;">
      <!-- Arabic Section -->
      <div dir="rtl" style="text-align: right; margin-bottom: 24px; border-bottom: 1px dashed #dddddd; padding-bottom: 20px;">
        <p style="margin-top: 0;">أهلاً بك <strong>${cleanName}</strong>،</p>
        <p>تم استلام طلب عرض السعر / رسالتك بنجاح. سيقوم فريقنا بمراجعة التفاصيل والتواصل معك في أقرب وقت ممكن.</p>
      </div>

      <!-- English Section -->
      <div dir="ltr" style="text-align: left;">
        <p style="margin-top: 0;">Hello <strong>${cleanName}</strong>,</p>
        <p>Your quote request / message has been received successfully. Our team will review your requirements and reach out to you shortly.</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 24px 0;" />
      
      <div style="text-align: center; font-size: 14px; color: #555555;">
        <p style="margin: 0 0 6px 0;">لأي استفسار عاجل يمكنك التواصل معنا عبر الواتساب / For urgent inquiries:</p>
        <a href="https://wa.me/905428104208" style="color: #25D366; font-weight: bold; text-decoration: none; font-size: 16px;">
          📱 WhatsApp: +90 542 810 4208
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
      zakariaprom.com - مكتبة زكريا للطباعة والدعاية والإعلان
    </div>
  </div>
</body>
</html>`;

  // Plain Text Fallbacks for non-HTML mail readers
  const adminText = `طلب عرض سعر جديدمن: ${cleanName}\nالبريد: ${cleanEmail}\nالهاتف: ${cleanPhone}\n\nالرسالة:\n${cleanMessage}`;
  const customerText = `أهلاً بك ${cleanName}،\nتم استلام طلبك بنجاح وسيتواصل معك فريقنا قريباً.\nHello ${cleanName},\nYour quote request has been received successfully.\n\nواتساب: +905428104208`;

  const mailOptionsAdmin = {
    from: `"موقع مكتبة زكريا" <${adminRecipient}>`,
    to: adminRecipient,
    replyTo: cleanEmail || adminRecipient,
    subject: emailSubject,
    text: adminText,
    html: adminHtml,
    encoding: 'utf-8'
  };

  // Dispatch via pooled transporter with retry logic
  let info = null;
  const tp = getPooledTransporter();

  try {
    info = await tp.sendMail(mailOptionsAdmin);
    console.log('[SMTP Mailer] Admin email sent successfully via pooled SMTP:', info.messageId);
  } catch (err) {
    console.error('[SMTP Mailer Pool Failed, trying fallback] Error:', err.message);
    // Reset pool and retry once after 500ms
    poolTransporter = null;
    const fallbackTp = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: adminRecipient, pass: 'Sy2242368.' },
      tls: { rejectUnauthorized: false }
    });
    info = await fallbackTp.sendMail(mailOptionsAdmin);
    console.log('[SMTP Mailer Fallback] Admin email sent:', info.messageId);
  }

  // Send Confirmation Copy to Customer
  if (cleanEmail && cleanEmail.includes('@')) {
    try {
      await tp.sendMail({
        from: `"مكتبة زكريا | Zakaria Prom" <${adminRecipient}>`,
        to: cleanEmail,
        subject: 'تم استلام طلبك بنجاح | Order Request Received - Zakaria Prom',
        text: customerText,
        html: customerHtml,
        encoding: 'utf-8'
      });
      console.log('[SMTP Mailer] Customer confirmation email sent to:', cleanEmail);
    } catch (custErr) {
      console.error('[SMTP Mailer] Customer confirmation failed:', custErr.message);
    }
  }

  return info;
}

module.exports = { sendContactEmail };
