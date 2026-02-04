# Ani Defteri Order Automation

Automated order processing system for Ani Defteri memory books. This application streamlines the order collection process via web forms, organizes customer data in Google Drive, and automates Photoshop design workflows.

## Features

- 📝 Web-based order form for customers
- ☁️ Automatic Google Drive organization
- 🎨 Photoshop automation scripts for design preparation
- 📄 PDF generation for customer previews
- 🖨️ Print-ready output generation

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Google Cloud OAuth credentials
- Adobe Photoshop (for design automation)
- Python 3.x (for PDF generation)

### Installation

1. **Clone the repository**:
   ```powershell
   git clone <repository-url>
   cd EkoPortal
   ```

2. **Install dependencies**:
   ```powershell
   cd src
   npm install
   ```

3. **Configure environment**:
   ```powershell
   # Copy the example environment file
   copy .env.example .env
   
   # Edit .env and add your Google OAuth credentials
   notepad .env
   ```

4. **Set up Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 Client ID
   - Set redirect URI: `http://localhost:3000/oauth2callback`
   - Copy Client ID and Secret to `.env`

5. **Authenticate with Google Drive**:
   ```powershell
   # Start the server
   npm start
   
   # Open browser and visit:
   # http://localhost:3000/auth
   
   # Complete the OAuth flow
   ```

6. **Access the application**:
   - Form: `http://localhost:3000`
   - The application is now ready to accept orders!

## Project Structure

```
EkoPortal/
├── src/                          # Backend application
│   ├── server.js                 # Express server & Drive API
│   ├── config.js                 # Configuration management
│   ├── .env                      # Environment variables (not in git)
│   ├── .env.example              # Environment template
│   ├── tokens.json               # OAuth tokens (not in git)
│   ├── public/                   # Frontend files
│   │   ├── index.html            # Order form
│   │   └── styles.css            # Styles
│   └── temp_uploads/             # Temporary file storage (not in git)
│
├── ani_defteri/
│   └── scripts/                  # Photoshop & Python scripts
│       ├── ani_defteri_hazirlama_sc.jsx    # Photoshop preparation
│       ├── ani_defteri_baski_sc.jsx        # Print layout script
│       └── pdf_yap.py                      # PDF generation
│
├── .gitignore                    # Git ignore rules
├── SECURITY.md                   # Security guidelines
├── prd.md                        # Product requirements
└── README.md                     # This file
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

#### Required:
- `GOOGLE_CLIENT_ID` - OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - OAuth Client Secret
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI

#### Optional:
- `PORT` - Server port (default: 3000)
- `DRIVE_ROOT_FOLDER_ID` - Root folder ID (improves performance)
- `GOOGLE_TOKENS` - Production token storage

### Configuration Priority

1. Environment variables (highest priority)
2. `config.json` (local development fallback)
3. Default values

## Usage

### For Customers

1. Receive order link via WhatsApp
2. Fill out the form with required information
3. Upload photos (special pages + general photos)
4. Submit the order
5. Receive order confirmation code

### For Operators

1. Orders appear in Google Drive: `Ani-Defteri-Siparisler/YYYY/MM/ORDER-ID__customer-name/`
2. Run Photoshop preparation script on the order folder
3. Review and adjust the automated design
4. Generate preview PDF
5. Send preview to customer via WhatsApp
6. After approval, run print/cut script

## Drive Folder Structure

```
Ani-Defteri-Siparisler/
  └── 2026/
      └── 02/
          └── 20260202-1153_AB12CD__customer-name/
              ├── bilgiler.txt           # Order information
              ├── order.json             # Metadata (optional)
              ├── genel/                 # General photos
              │   ├── Foto_001.jpg
              │   └── Foto_002.jpg
              └── ozel/                  # Special page photos
                  ├── 01_Sayfa.jpg
                  ├── 03_Sayfa_1.jpg
                  └── 03_Sayfa_2.jpg
```

## Security

⚠️ **Important**: This application handles sensitive customer data and OAuth credentials.

- Never commit `.env` or `tokens.json` files
- Rotate OAuth credentials if exposed
- See [SECURITY.md](./SECURITY.md) for detailed security guidelines

## API Endpoints

- `GET /` - Order form
- `POST /api/olustur` - Create new order
- `GET /auth` - Initiate OAuth flow
- `GET /oauth2callback` - OAuth callback handler

## Development

### Running in Development

```powershell
cd src
npm start
```

Server runs on `http://localhost:3000`

### Testing Orders

1. Open `http://localhost:3000`
2. Fill out the form
3. Upload test images
4. Check Google Drive for created folder

## Production Deployment

For production deployment:

1. Set all environment variables (don't use `.env` files)
2. Set `DRIVE_ROOT_FOLDER_ID` for better performance
3. Use secure token storage (e.g., Azure Key Vault)
4. Enable HTTPS
5. Implement rate limiting

See [SECURITY.md](./SECURITY.md) for production security guidelines.

## Troubleshooting

### "Google Drive yetkisi yok" Error
**Solution**: Visit `/auth` endpoint to authenticate

### Server won't start
**Solution**: Check `.env` file has all required variables

### Files not uploading to Drive
**Solution**: 
1. Check OAuth token validity
2. Re-authenticate via `/auth`
3. Check Drive folder permissions

### Configuration validation failed
**Solution**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

## Contributing

1. Never commit sensitive files (`.env`, `tokens.json`)
2. Follow existing code style
3. Test OAuth flow after changes
4. Update documentation for new features

## License

[Add license information]

## Support

For issues or questions:
- Check [SECURITY.md](./SECURITY.md) for security issues
- Review [prd.md](./prd.md) for product requirements
- Contact the development team

---

**Note**: This application is designed for internal use. Ensure proper security measures are in place before exposing to the internet.
