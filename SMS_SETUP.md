# SMS Configuration for SlumLink

## Overview
SlumLink automatically sends SMS notifications to slum dwellers when their accounts are verified by administrators. This feature uses the BulkSMSBD API.

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` in the backend directory and configure:

```bash
# BulkSMSBD API Configuration
BULKSMS_API_KEY=your_actual_api_key_here
BULKSMS_SENDER_ID=SlumLink
```

### 2. BulkSMSBD API Setup
1. Register at [BulkSMSBD](http://bulksmsbd.net/)
2. Get your API key from the dashboard
3. Set up sender ID (default: "SlumLink")

### 3. SMS Message Format
When an admin approves a pending slum dweller account, the system automatically sends:

```
SlumLink account verification completed successfully. Please log in using your registered credentials. Slum ID: [SLUM_CODE].
SlumLink
```

## Implementation Details

### Files Modified
- `backend/utils/sms.js` - SMS utility functions
- `backend/controllers/slumDweller.controller.js` - Added SMS notification to approval process
- `.env.example` - Environment variable documentation

### API Endpoint
- **PATCH** `/api/slum-dweller/:id/approve` - Now includes SMS notification

### Error Handling
- SMS failures do NOT prevent account approval
- All SMS errors are logged for debugging
- Graceful fallback if API key is missing

### Dependencies
- `node-fetch` - For HTTP requests to BulkSMSBD API
- `dotenv` - Environment variable management

## Testing
1. Create a test slum dweller account through the signup process
2. Use admin panel to approve the account
3. Check console logs for SMS delivery status
4. Verify slum dweller receives SMS on their mobile

## Troubleshooting
- Check console logs for SMS delivery status
- Verify API key and sender ID configuration
- Ensure mobile numbers are in correct format (BD: 01XXXXXXXXX)
- Check BulkSMSBD account balance and API limits