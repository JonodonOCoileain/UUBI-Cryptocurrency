# Gmail Setup for UUBI Password Reset Emails

## Prerequisites

1. **Gmail Account**: You need a Gmail account
2. **2-Factor Authentication**: Must be enabled on your Gmail account
3. **App Password**: Generate a Gmail App Password (not your regular password)

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click "2-Step Verification"
3. Follow the setup process

### 2. Generate App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click "2-Step Verification" (if not already enabled)
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select "Mail" and "Other (Custom name)"
6. Enter "UUBI Cryptocurrency" as the name
7. Click "Generate"
8. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Set Environment Variables

Create a `.env` file in the project root:

```bash
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Test Email Sending

1. Start the server: `npm start`
2. Go to `http://localhost:3000`
3. Click "Login to Existing Account"
4. Click "Forgot your password?"
5. Enter your email address
6. Check your Gmail inbox for the password reset email

## Troubleshooting

### "Invalid login" Error
- Make sure you're using the App Password, not your regular Gmail password
- Ensure 2-factor authentication is enabled
- Check that the App Password is correct (16 characters, no spaces)

### "Less secure app access" Error
- This is normal - use App Passwords instead
- App Passwords are more secure than "less secure app access"

### Email Not Received
- Check your spam folder
- Verify the Gmail credentials are correct
- Check the server console for error messages

## Security Notes

- **Never commit** your `.env` file to version control
- **Use App Passwords** instead of your regular Gmail password
- **Rotate App Passwords** regularly for security
- **Monitor** your Gmail account for suspicious activity

## Development Mode

If Gmail is not configured, the system will:
- Log reset URLs to the console
- Display reset URLs in the web interface
- Continue working in simulation mode

This allows development and testing without requiring Gmail setup.
