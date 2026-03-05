import nodemailer from 'nodemailer';
import { IntakeFormData } from '@/types/form';

// Create a transporter using SMTP
const createTransporter = (userEmail?: string) => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
  secure: true, // use true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER || userEmail,
    pass: process.env.EMAIL_PASS, // ⚠️ App Password (not your Gmail password)
  },
});

export const sendEmail = async (to: string, subject: string, html: string, from?: string) => {
  try {
    const transporter = createTransporter(from);
    const info = await transporter.sendMail({
      from: from || process.env.EMAIL_FROM, // sender address
      to, // list of receivers
      subject, // Subject line
      html, // html body
    });

    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

export const sendOTPEmail = async (to: string, otp: string) => {
  const subject = 'Your OTP Code';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
        }
        .container {
          background-color: #ffffff;
          margin: 20px;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .footer {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          text-align: center;
          border-left: 4px solid #667eea;
        }
        .footer p {
          margin: 0;
          font-size: 14px;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Your OTP Code</h1>
        </div>
        <p>Please use the following One-Time Password (OTP) to verify your account:</p>
        <div class="otp-code">${otp}</div>
        <p>This code will expire in 10 minutes. Do not share this code with anyone.</p>
        <div class="footer">
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

export const sendIntakeSubmissionEmail = async (formData: IntakeFormData) => {
  console.log("formData", formData);

  const subject = 'New Intake Form Submission';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Intake Form Submission</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          background-color: #f8f9fa;
        }
        .container {
          background-color: #ffffff;
          margin: 20px;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .section {
          margin-bottom: 30px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
        }
        .section-header {
          background-color: #f8f9fa;
          padding: 15px 20px;
          border-bottom: 2px solid #dee2e6;
          margin: 0;
        }
        .section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #495057;
        }
        .section-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #6c757d;
        }
        .section-content {
          padding: 20px;
        }
        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .info-item {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #f1f3f4;
        }
        .info-item:last-child {
          border-bottom: none;
        }
        .info-label {
          font-weight: 600;
          color: #495057;
          min-width: 180px;
          flex-shrink: 0;
        }
        .info-value {
          color: #6c757d;
          flex: 1;
        }
        .footer {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          text-align: center;
          border-left: 4px solid #667eea;
        }
        .footer p {
          margin: 0;
          font-size: 16px;
          color: #495057;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            padding: 20px;
          }
          .info-item {
            flex-direction: column;
          }
          .info-label {
            min-width: auto;
            margin-bottom: 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Intake Form Submission</h1>
        </div>

        <div class="section">
          <h2 class="section-header">Plaintiff Information</h2>
          <div class="section-content">
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Client Name:</span>
                <span class="info-value">${formData.clientName || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Gender:</span>
                <span class="info-value">${formData.gender || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Date of Birth:</span>
                <span class="info-value">${formData.dateOfBirth || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${formData.phoneNumber || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${formData.email || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${formData.address || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">City:</span>
                <span class="info-value">${formData.city || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Zip:</span>
                <span class="info-value">${formData.zip || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">SSN:</span>
                <span class="info-value">${formData.ssn || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="section-header">Accident Information</h2>
          <div class="section-content">
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Accident Date:</span>
                <span class="info-value">${formData.accidentDate || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Accident Time:</span>
                <span class="info-value">${formData.accidentTime || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Accident Location:</span>
                <span class="info-value">${formData.accidentLocation || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Accident Description:</span>
                <span class="info-value">${formData.accidentDescription || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Passenger:</span>
                <span class="info-value">${formData.passenger || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Passenger Name:</span>
                <span class="info-value">${formData.passengerName || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Work at Accident:</span>
                <span class="info-value">${formData.workAtAccident || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="section-header">Defendant Information</h2>
          <div class="section-content">
            <h3 class="section-header" style="background-color: #e9ecef; border-bottom: 1px solid #dee2e6;">Defendant 1</h3>
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">${formData.defendant1Name || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${formData.defendant1Address || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Carrier:</span>
                <span class="info-value">${formData.defendant1Carrier || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Carrier Phone:</span>
                <span class="info-value">${formData.defendant1CarrierPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Year:</span>
                <span class="info-value">${formData.defendant1Year || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Make:</span>
                <span class="info-value">${formData.defendant1Make || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Model:</span>
                <span class="info-value">${formData.defendant1Model || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Damage:</span>
                <span class="info-value">${formData.defendant1Damage || 'N/A'}</span>
              </li>
            </ul>

            <h3 class="section-header" style="background-color: #e9ecef; border-bottom: 1px solid #dee2e6; margin-top: 20px;">Defendant 2</h3>
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">${formData.defendant2Name || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${formData.defendant2Address || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Carrier:</span>
                <span class="info-value">${formData.defendant2Carrier || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Carrier Phone:</span>
                <span class="info-value">${formData.defendant2CarrierPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Year:</span>
                <span class="info-value">${formData.defendant2Year || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Make:</span>
                <span class="info-value">${formData.defendant2Make || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Model:</span>
                <span class="info-value">${formData.defendant2Model || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Damage:</span>
                <span class="info-value">${formData.defendant2Damage || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="section-header">Client Insurance Information</h2>
          <div class="section-content">
            <h3 class="section-header" style="background-color: #e9ecef; border-bottom: 1px solid #dee2e6;">Auto Insurance</h3>
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">${formData.autoName || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${formData.autoPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${formData.autoAddress || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Agent:</span>
                <span class="info-value">${formData.autoAgent || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Policy:</span>
                <span class="info-value">${formData.autoPolicy || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Claim:</span>
                <span class="info-value">${formData.autoClaim || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Additional Info:</span>
                <span class="info-value">${formData.autoAdditionalinfo || 'N/A'}</span>
              </li>
            </ul>

            <h3 class="section-header" style="background-color: #e9ecef; border-bottom: 1px solid #dee2e6; margin-top: 20px;">Health Insurance</h3>
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Carrier:</span>
                <span class="info-value">${formData.healthCarrier || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${formData.healthPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Address:</span>
                <span class="info-value">${formData.healthAddress || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Agent:</span>
                <span class="info-value">${formData.healthAgent || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Policy:</span>
                <span class="info-value">${formData.healthPolicy || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Claim:</span>
                <span class="info-value">${formData.healthClaim || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Adjuster:</span>
                <span class="info-value">${formData.healthAdjuster || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Medicare:</span>
                <span class="info-value">${formData.medicare || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Medicare Number:</span>
                <span class="info-value">${formData.medicareNumber || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Medicaid:</span>
                <span class="info-value">${formData.medicaid || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Medicaid Number:</span>
                <span class="info-value">${formData.medicaidNumber || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Additional Info:</span>
                <span class="info-value">${formData.healthAdditionalinfo || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="section-header">Medical Treatment</h2>
          <div class="section-content">
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">Ambulance:</span>
                <span class="info-value">${formData.ambulance || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Admitted:</span>
                <span class="info-value">${formData.admitted || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Ambulance Company:</span>
                <span class="info-value">${formData.ambulanceCompany || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Length of Stay:</span>
                <span class="info-value">${formData.lengthOfStay || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Injuries:</span>
                <span class="info-value">${formData.priorInjuries || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Doctor/Hospital:</span>
                <span class="info-value">${formData.priorDoctorHospital || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Hospital Address/Phone:</span>
                <span class="info-value">${formData.priorHospitalAddressPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Treatment Details:</span>
                <span class="info-value">${formData.priorTreatmentDetails || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Treatment From:</span>
                <span class="info-value">${formData.priorTreatmentFrom || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Treatment To:</span>
                <span class="info-value">${formData.priorTreatmentTo || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Insurance Claims:</span>
                <span class="info-value">${formData.priorInsuranceClaims || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Prior Attorneys:</span>
                <span class="info-value">${formData.priorAttorneys || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Treatment:</span>
                <span class="info-value">${formData.currentTreatment || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Doctor/Hospital:</span>
                <span class="info-value">${formData.currentDoctorHospital || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Hospital Address/Phone:</span>
                <span class="info-value">${formData.currentHospitalAddressPhone || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Treatment Details:</span>
                <span class="info-value">${formData.currentTreatmentDetails || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Treatment From:</span>
                <span class="info-value">${formData.currentTreatmentFrom || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Current Treatment To:</span>
                <span class="info-value">${formData.currentTreatmentTo || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <h2 class="section-header">Additional Information</h2>
          <div class="section-content">
            <ul class="info-list">
              <li class="info-item">
                <span class="info-label">How did you hear about us:</span>
                <span class="info-value">${formData.hearAboutUs || 'N/A'}</span>
              </li>
              <li class="info-item">
                <span class="info-label">Details:</span>
                <span class="info-value">${formData.hearAboutUsDetail || 'N/A'}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p><strong>Please review the submission in the admin panel.</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send to admin or specific email
  const adminEmail = formData.email || 'admin@example.com';
  // Use the user's email as the sender
  const fromEmail = process.env.EMAIL_FROM;
  return await sendEmail(adminEmail, subject, html, fromEmail);
};
