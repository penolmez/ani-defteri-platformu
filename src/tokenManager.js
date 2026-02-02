const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKENS_FILE = path.join(__dirname, 'customer-tokens.json');

/**
 * Initialize tokens file if it doesn't exist
 */
function initTokensFile() {
    if (!fs.existsSync(TOKENS_FILE)) {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify({ tokens: [] }, null, 2));
    }
}

/**
 * Generate a unique cryptographically random token
 * @returns {string} 32-character hex token
 */
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new token for a customer
 * @param {string} customerName - Customer's full name
 * @param {number} expiresInDays - Number of days until token expires (default: 7)
 * @returns {string} Generated token
 */
function createToken(customerName, expiresInDays = 7) {
    initTokensFile();

    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    const token = generateToken();

    const newToken = {
        token: token,
        customerName: customerName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
        used: false,
        usedAt: null,
        orderId: null
    };

    tokensData.tokens.push(newToken);
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensData, null, 2));

    return token;
}

/**
 * Validate a token and return its status
 * @param {string} token - Token to validate
 * @returns {Object} Validation result with status and data
 */
function validateToken(token) {
    initTokensFile();

    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    const tokenObj = tokensData.tokens.find(t => t.token === token);

    if (!tokenObj) {
        return { valid: false, reason: 'not_found' };
    }

    if (tokenObj.used) {
        return { valid: false, reason: 'already_used', tokenData: tokenObj };
    }

    if (new Date() > new Date(tokenObj.expiresAt)) {
        return { valid: false, reason: 'expired', tokenData: tokenObj };
    }

    return { valid: true, tokenData: tokenObj };
}

/**
 * Mark a token as used after order creation
 * @param {string} token - Token to mark as used
 * @param {string} orderId - Associated order ID
 * @returns {boolean} Success status
 */
function markTokenUsed(token, orderId) {
    initTokensFile();

    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    const tokenObj = tokensData.tokens.find(t => t.token === token);

    if (tokenObj) {
        tokenObj.used = true;
        tokenObj.usedAt = new Date().toISOString();
        tokenObj.orderId = orderId;
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensData, null, 2));
        return true;
    }

    return false;
}

/**
 * Get all tokens (for admin panel)
 * @returns {Array} Array of all tokens
 */
function getAllTokens() {
    initTokensFile();
    const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    return tokensData.tokens;
}

module.exports = {
    createToken,
    validateToken,
    markTokenUsed,
    getAllTokens
};
