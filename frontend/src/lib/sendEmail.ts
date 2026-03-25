import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendIntakeReferenceEmail(to: string, name: string, caseType: string, referenceId: string) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 16px;">
      <h2 style="color: #333;">Hello ${name},</h2>
      <p>Thank you for starting your <b>${caseType}</b> case with us.</p>
      <p>Your reference ID is:</p>
      <p style="font-size: 18px; font-weight: bold; color: #0070f3;">${referenceId}</p>
      <p>Please keep this ID for future communication.</p>
      <p>You can access your form using this link below!</p>
      <p>${process.env.INTAKE_LIST_URL}</p>
      <br/>
      <p>— The Legasys Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your ${caseType} Case Reference ID`,
    html: htmlContent,
  });
}

// NEW: Generic email function
export async function sendEmail({
  to,
  subject,
  text,
  html,
  name,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  name?: string;
}) {
  const htmlContent = html || `
    <div style="font-family: Arial, sans-serif; padding: 16px; max-width: 600px;">
      ${name ? `<h2 style="color: #333;">Dear ${name},</h2>` : ''}
      <div style="line-height: 1.6;">
        ${text.replace(/\n/g, '<br/>')}
      </div>
      <br/>
      <p style="color: #666; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
        — The Legasys Team
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: htmlContent,
    text: text, // Also include plain text version
  });
}
