# Security Guidelines

This document outlines security practices and procedures for the Ani Defteri Order Automation project.

## Overview

This application handles customer data and uses Google OAuth for Drive access. Proper security configuration is essential to protect sensitive information.

## Sensitive Files (Never Commit)

The following files contain secrets and **must never** be committed to version control:

- `.env` - Contains OAuth client credentials
- `tokens.json` - Contains OAuth access and refresh tokens
- `config.json` - May contain local configuration secrets
- `temp_uploads/` - Contains customer uploaded files

These are protected by `.gitignore`. Always verify before committing.

## Initial Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (or use existing)
3. Set authorized redirect URI: `http://localhost:3000/oauth2callback`
4. Copy the Client ID and Client Secret

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```powershell
   cd src
   copy .env.example .env
   ```

2. Edit `.env` and fill in your OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

3. Save the file

### 3. First-Time Authentication

1. Start the server:
   ```powershell
   cd src
   npm start
   ```

2. Visit: `http://localhost:3000/auth`

3. Complete the Google OAuth flow

4. The server will save `tokens.json` automatically

5. You're ready to use the application!

## OAuth Token Rotation

If your OAuth credentials have been exposed or compromised:

### Immediate Steps

1. **Rotate the Client Secret**:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
   - Find your OAuth 2.0 Client ID
   - Click "Reset Secret" or create a new Client ID
   - Copy the new Client Secret

2. **Update Local Configuration**:
   ```powershell
   # Edit src/.env with new credentials
   notepad src\.env
   ```

3. **Delete Old Tokens**:
   ```powershell
   cd src
   del tokens.json
   ```

4. **Re-authenticate**:
   - Start server: `npm start`
   - Visit: `http://localhost:3000/auth`
   - Complete OAuth flow

## Production Deployment

For production environments, use environment variables instead of file-based configuration.

### Required Environment Variables

```bash
# OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth2callback

# OAuth Tokens (JSON string)
GOOGLE_TOKENS='{"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":123456789}'

# Drive Configuration
DRIVE_ROOT_FOLDER_ID=your-root-folder-id

# Server Configuration
PORT=3000
```

### Getting DRIVE_ROOT_FOLDER_ID

1. Open your root folder in Google Drive
2. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/[THIS_IS_THE_FOLDER_ID]
   ```
3. Set as environment variable

This eliminates the need to search for the folder on every request.

### Getting GOOGLE_TOKENS

After authenticating locally:

1. Open `src/tokens.json`
2. Copy the entire JSON content
3. Set as environment variable (properly escaped for your shell)

**Note**: Tokens expire and refresh automatically. Ensure your production environment can persist token updates.

## Security Best Practices

### Development

- ✅ Never commit `.env` or `tokens.json`
- ✅ Use `.env.example` as template only
- ✅ Keep `tokens.json` only on your local machine
- ✅ Delete `temp_uploads/` contents regularly

### Production

- ✅ Use environment variables for all secrets
- ✅ Store secrets in secure secret management service (e.g., Azure Key Vault, AWS Secrets Manager)
- ✅ Set `DRIVE_ROOT_FOLDER_ID` to avoid API searches
- ✅ Enable rate limiting and monitoring
- ✅ Use HTTPS for all communications
- ✅ Regularly rotate OAuth credentials

### Data Retention

- Consider implementing automatic deletion of old orders from Drive
- Document data retention policy for GDPR/KVKK compliance
- Implement secure deletion procedures

## OAuth Scopes

Current scope: `https://www.googleapis.com/auth/drive.file`

This scope allows the app to:
- ✅ Create folders it owns
- ✅ Upload files to folders it created
- ❌ Cannot access files/folders created by other apps
- ❌ Cannot access user's entire Drive

This is the minimum required scope for the application.

## Troubleshooting

### "Google Drive yetkisi yok" Error

**Solution**: Visit `http://localhost:3000/auth` to authenticate

### "GOOGLE_TOKENS parse hatası" Error

**Solution**: 
1. Check `GOOGLE_TOKENS` environment variable format (must be valid JSON)
2. Or delete `tokens.json` and re-authenticate

### Configuration Validation Failed

**Solution**: Ensure all required variables are set in `.env` or environment

## Emergency Response

If credentials are leaked to a public repository:

1. **Immediately** rotate OAuth Client Secret in Google Console
2. Delete and regenerate all tokens
3. Review Google Cloud Console audit logs
4. Check for unauthorized Drive access
5. Update all local and production configurations
6. Consider rotating the entire OAuth Client ID if necessary

## Questions?

Contact the development team for security-related questions or concerns.
