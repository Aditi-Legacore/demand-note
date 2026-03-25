// @/lib/sendSMS.ts
import twilio from 'twilio';

// Initialize Twilio client (if using Twilio)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  // Validate phone number (basic validation)
  const phoneNumber = to.replace(/\D/g, '');
  if (phoneNumber.length < 10) {
    throw new Error("Invalid phone number");
  }

  // If Twilio is configured, use it
  if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to, // Format: +1234567890
      });
      console.log("SMS sent via Twilio:", result.sid);
      return result;
    } catch (error) {
      console.error("Twilio error:", error);
      throw error;
    }
  }

  // Alternative: Use a different SMS service or API
  // For now, we'll log the SMS (development mode)
  console.log("SMS would be sent (no SMS service configured):");
  console.log("To:", to);
  console.log("Message:", message);
  
  // In production, you might want to throw an error or use a different service
  if (process.env.NODE_ENV === "production") {
    throw new Error("SMS service not configured");
  }
  
  // Return mock response in development
  return { sid: "mock-sms-id", status: "sent" };
}

// Optional: Format phone number helper
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if missing (assuming US/Canada)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Return as is for international numbers
  return `+${cleaned}`;
}