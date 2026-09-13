# Gmail OAuth2 Setup Instructions

To send real emails using your Gmail account (`slumlink1234@gmail.com`) without an App Password, follow these steps to set up OAuth2 authentication:

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Enter project name (e.g., "SLUMLINK Email")
4. Click "Create"

## Step 2: Enable Gmail API

1. In your Google Cloud project, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you have a workspace)
3. Fill in required fields:
   - App name: SLUMLINK
   - User support email: slumlink1234@gmail.com
   - Developer contact: slumlink1234@gmail.com
4. Click "Save and Continue"
5. Skip "Scopes" (click "Save and Continue")
6. Add test users: slumlink1234@gmail.com
7. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Name: SLUMLINK Email Service
5. Add Authorized redirect URI: `https://developers.google.com/oauthplayground`
6. Click "Create"
7. **SAVE** the Client ID and Client Secret

## Step 5: Generate Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (⚙️) in top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 4
5. In the left panel, find "Gmail API v1"
6. Select: `https://mail.google.com/`
7. Click "Authorize APIs"
8. Sign in with slumlink1234@gmail.com
9. Click "Allow"
10. Click "Exchange authorization code for tokens"
11. **COPY** the "Refresh token" value

## Step 6: Update .env File

Open `backend/.env` and update with your credentials:

```env
# Email Configuration (Gmail OAuth2)
EMAIL_USER=slumlink1234@gmail.com
GMAIL_CLIENT_ID=your_client_id_from_step4.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_from_step4
GMAIL_REFRESH_TOKEN=your_refresh_token_from_step5
```

## Step 7: Enable Real Email Sending

1. Open `backend/utils/email.js`
2. Change line 5:
   ```javascript
   const SEND_REAL_EMAILS = true; // Changed from false to true
   ```

## Step 8: Restart Server

```bash
npm start
```

Now your system will send real emails using OAuth2 authentication! 📧

---

## Current Status: DEMO MODE

The system is currently in **DEMO MODE** (SEND_REAL_EMAILS = false).
Approval/rejection emails are logged to the console instead of being sent.

This allows you to test the NGO verification workflow without configuring OAuth2.
