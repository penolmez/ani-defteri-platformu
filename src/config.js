/**
 * Central configuration module
 * Loads configuration from environment variables (priority) or local config.json (fallback)
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file (if it exists)
require('dotenv').config();

/**
 * Load configuration from environment variables or config.json
 * @returns {Object} Configuration object
 */
function loadConfig() {
    const config = {
        // Server
        port: process.env.PORT || 3000,

        // Google OAuth
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
        },

        // Google Drive
        drive: {
            rootFolderId: process.env.DRIVE_ROOT_FOLDER_ID || null,
            rootFolderName: 'Ani-Defteri-Siparisler', // Used if rootFolderId is not set
        },

        // Token storage (for production)
        googleTokens: process.env.GOOGLE_TOKENS || null,

        // Admin Panel Configuration
        admin: {
            username: process.env.ADMIN_USERNAME || 'admin',
            // SECURITY FIX: Never hardcode passwords!
            // If env var is missing, validation will catch it
            password: process.env.ADMIN_PASSWORD
        }
    };

    // Try to load from config.json if it exists (development fallback)
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('📝 Loading configuration from config.json');

            // Merge local config (only for fields not set by env vars)
            if (!config.google.clientId && localConfig.google?.clientId) {
                config.google.clientId = localConfig.google.clientId;
            }
            if (!config.google.clientSecret && localConfig.google?.clientSecret) {
                config.google.clientSecret = localConfig.google.clientSecret;
            }
            if (!config.drive.rootFolderId && localConfig.drive?.rootFolderId) {
                config.drive.rootFolderId = localConfig.drive.rootFolderId;
            }
        } catch (error) {
            console.warn('⚠️  Warning: config.json exists but could not be parsed:', error.message);
        }
    }

    return config;
}

/**
 * Validate that all required configuration is present
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If required configuration is missing
 */
function validateConfig(config) {
    const errors = [];

    if (!config.google.clientId) {
        errors.push('GOOGLE_CLIENT_ID is required (set in .env or config.json)');
    }
    if (!config.google.clientSecret) {
        errors.push('GOOGLE_CLIENT_SECRET is required (set in .env or config.json)');
    }
    if (!config.google.redirectUri) {
        errors.push('GOOGLE_REDIRECT_URI is required');
    }

    // SECURITY FIX: Validate admin credentials
    if (!config.admin.username) {
        errors.push('ADMIN_USERNAME is required (set in .env)');
    }
    if (!config.admin.password) {
        errors.push('ADMIN_PASSWORD is required (set in .env)');
    }

    if (errors.length > 0) {
        throw new Error(
            '❌ Configuration Error:\n' +
            errors.map(e => `  - ${e}`).join('\n') +
            '\n\nPlease check your .env file or config.json'
        );
    }

    // Warnings (non-critical)
    if (!config.drive.rootFolderId) {
        console.warn(
            '⚠️  Warning: DRIVE_ROOT_FOLDER_ID not set. ' +
            `The app will search for "${config.drive.rootFolderName}" folder on every request. ` +
            'Consider setting DRIVE_ROOT_FOLDER_ID for better performance.'
        );
    }

    console.log('✅ Configuration validated successfully');
}

// Load and validate configuration
const config = loadConfig();
validateConfig(config);

module.exports = config;
