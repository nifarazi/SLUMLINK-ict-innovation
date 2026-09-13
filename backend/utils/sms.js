// SMS utility functions using BulkSMSBD API
import fetch from 'node-fetch';

export async function sendSMS(number, message) {
  try {
    // Using the same API as found in the signup process
    const apiKey = process.env.BULKSMS_API_KEY || '';
    const senderid = process.env.BULKSMS_SENDER_ID || 'SlumLink';
    
    if (!apiKey) {
      console.warn('⚠️ BulkSMSBD API key not configured');
      return false;
    }
    
    const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(number)}&senderid=${encodeURIComponent(senderid)}&message=${encodeURIComponent(message)}`;
    
    // Use GET method as per the existing implementation
    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      console.log('📱 SMS sent successfully to:', number);
      return true;
    } else {
      console.error('❌ SMS send failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ SMS send error:', error);
    return false;
  }
}

export function createVerificationMessage(slumCode) {
  return `SlumLink account verification completed successfully. Please log in using your registered credentials. Slum ID: ${slumCode}.
SlumLink`;
}

// Create OTP message for spouse verification during add member process
export function createOTPMessage(otp, spouseName, verificationType = 'spouse verification') {
  return `Your SlumLink OTP for ${verificationType} is: ${otp}. Valid for 5 minutes. Name: ${spouseName}. Do not share this code.
- SlumLink`;
}