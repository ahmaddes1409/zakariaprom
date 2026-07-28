const nodemailer = require('nodemailer');

// Hostinger SMTP Transporter Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // Port 465 uses SSL/TLS
  auth: {
    user: process.env.SMTP_USER || 'info@zakariaprom.com',
    pass: process.env.SMTP_PASS || 'Sy2242368'
  },
  tls: {
    rejectUnauthorized: false // Prevents failures due to custom/shared SSL cert chains
  }
});

/**
 * Send Contact / Quote Request Email to Admin & Confirmation to Customer
 */
async function sendContactEmail({ name, email, phone, message, subject }) {
  const adminRecipient = 'info@zakariaprom.com';
  const cleanName = (name || 'عميل / Customer').trim();
  const cleanEmail = (email || '').trim();
  const cleanPhone = (phone || 'غير محدد / Not specified').trim();
  const cleanMessage = (message || '').trim();
  const emailSubject = subject || `طلب عرض سعر جديد من: ${cleanName}`;

  // 1. Email HTML Body to Admin (info@zakariaprom.com)
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f4f7f6; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <div style="background-color: #0e4a6f; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px;">📩 طلب عرض سعر / رسالة تواصل جديدة</h2>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.85;">مكتبة زكريا - zakariaprom.com</p>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; font-weight: bold; width: 30%; border-bottom: 1px solid #eee; color: #0e4a6f;">👤 الاسم:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${cleanName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; color: #0e4a6f;">✉️ البريد الإلكتروني:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;"><a href="mailto:${cleanEmail}" style="color: #00a8a8; text-decoration: none;">${cleanEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; color: #0e4a6f;">📞 رقم الهاتف:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;" dir="ltr">${cleanPhone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee; color: #0e4a6f;">📅 التاريخ:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${new Date().toLocaleString('ar-SA')}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-right: 4px solid #00a8a8; padding: 16px; border-radius: 6px; margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #0e4a6f;">💬 تفاصيل الرسالة / طلب عرض السعر:</h4>
            <p style="margin: 0; color: #444; line-height: 1.6; white-space: pre-wrap;">${cleanMessage}</p>
          </div>
        </div>

        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          تم إرسال هذه الرسالة تلقائياً من نموذج التواصل في موقع zakariaprom.com
        </div>
      </div>
    </div>
  `;

  // 2. Confirmation HTML to Customer
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f4f7f6; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <div style="background-color: #0e4a6f; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 22px;">شكراً لتواصلك مع مكتبة زكريا</h2>
        </div>
        <div style="padding: 24px; color: #333; line-height: 1.6;">
          <p>أهلاً بك <strong>${cleanName}</strong>،</p>
          <p>تم استلام طلب عرض السعر / رسالتك بنجاح. سيقوم فريقنا بمراجعة التفاصيل والتواصل معك في أقرب وقت ممكن.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 13px; color: #666;">
            لأي استفسار عاجل يمكنك التواصل معنا عبر الواتساب مباشرة على الرقم: <a href="https://wa.me/905428104208" style="color: #25D366; font-weight: bold;">+90 542 810 4208</a>
          </p>
        </div>
      </div>
    </div>
  `;

  // Send to Admin
  const mailOptionsAdmin = {
    from: `"موقع مكتبة زكريا" <${adminRecipient}>`,
    to: adminRecipient,
    replyTo: cleanEmail || adminRecipient,
    subject: emailSubject,
    html: adminHtml
  };

  const info = await transporter.sendMail(mailOptionsAdmin);
  console.log('[SMTP Mailer] Admin email sent successfully:', info.messageId);

  // Send Confirmation Copy to Customer (if valid email provided)
  if (cleanEmail && cleanEmail.includes('@')) {
    try {
      await transporter.sendMail({
        from: `"مكتبة زكريا" <${adminRecipient}>`,
        to: cleanEmail,
        subject: 'تم استلام طلبك بنجاح - مكتبة زكريا',
        html: customerHtml
      });
      console.log('[SMTP Mailer] Customer confirmation email sent to:', cleanEmail);
    } catch (custErr) {
      console.error('[SMTP Mailer] Customer confirmation failed:', custErr.message);
    }
  }

  return info;
}

module.exports = { sendContactEmail };
