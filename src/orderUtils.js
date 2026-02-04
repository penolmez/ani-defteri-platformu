/**
 * Order Utilities Module
 * Handles order ID generation, customer slug creation, and folder naming
 */

/**
 * Generate a unique order ID
 * Format: YYYYMMDD-HHmm_<RANDOM6>
 * Example: 20260202-1534_A7B9C2
 * 
 * @returns {string} Unique order ID
 */
function generateOrderId() {
    const now = new Date();

    // Date part: YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    // Time part: HHmm
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timePart = `${hours}${minutes}`;

    // Random part: 6 alphanumeric characters (uppercase)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${datePart}-${timePart}_${randomPart}`;
}

/**
 * Create a URL-safe slug from customer name
 * Normalizes Turkish characters and converts to lowercase
 * 
 * @param {string} customerName - Original customer name
 * @returns {string} Normalized slug
 * 
 * @example
 * createCustomerSlug('Berat Ölmez') // returns 'berat-olmez'
 * createCustomerSlug('Şule Çağlar') // returns 'sule-caglar'
 */
function createCustomerSlug(customerName) {
    if (!customerName) return 'unknown';

    // Turkish character mapping
    const turkishMap = {
        'ş': 's', 'Ş': 's',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o',
        'ü': 'u', 'Ü': 'u',
        'ç': 'c', 'Ç': 'c'
    };

    let slug = customerName;

    // Replace Turkish characters
    for (const [turkish, latin] of Object.entries(turkishMap)) {
        slug = slug.replace(new RegExp(turkish, 'g'), latin);
    }

    // Convert to lowercase
    slug = slug.toLowerCase();

    // Replace spaces and non-alphanumeric chars with dash
    slug = slug.replace(/[^a-z0-9]+/g, '-');

    // Remove leading/trailing dashes
    slug = slug.replace(/^-+|-+$/g, '');

    // Replace consecutive dashes with single dash
    slug = slug.replace(/-+/g, '-');

    return slug;
}

/**
 * Create the order folder name combining ID and customer slug
 * Format: <ORDER_ID>__<customerSlug>
 * 
 * @param {string} orderId - Unique order ID
 * @param {string} customerSlug - Normalized customer slug
 * @returns {string} Complete folder name
 * 
 * @example
 * createOrderFolderName('20260202-1534_A7B9C2', 'berat-olmez')
 * // returns '20260202-1534_A7B9C2__berat-olmez'
 */
function createOrderFolderName(orderId, customerSlug) {
    return `${orderId}__${customerSlug}`;
}

/**
 * Get year/month path from date
 * Format: YYYY/MM
 * 
 * @param {Date} date - Date object
 * @returns {string} Year/month path
 * 
 * @example
 * getYearMonthPath(new Date('2026-02-02')) // returns '2026/02'
 */
function getYearMonthPath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
}

module.exports = {
    generateOrderId,
    createCustomerSlug,
    createOrderFolderName,
    getYearMonthPath
};
