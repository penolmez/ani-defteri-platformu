const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
require('dotenv').config();

// Load centralized configuration
const config = require('./config');
const orderUtils = require('./orderUtils');
const tokenManager = require('./tokenManager');

// Rate limiting for anti-spam
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.static('public'));

// --- FILE UPLOAD CONFIGURATION ---

// Multer configuration with security limits
const uploadConfig = multer({
    dest: 'temp_uploads/',
    limits: {
        fileSize: 20 * 1024 * 1024,  // 20MB per file
        files: 50                      // Maximum 50 files per request
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Geçersiz dosya tipi: ${file.mimetype}. Sadece resim dosyaları (JPG, PNG, GIF, WebP) yüklenebilir.`));
        }
    }
});

const upload = uploadConfig;

// --- GOOGLE DRIVE SETUP ---
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
);

const TOKEN_PATH = 'tokens.json';

// Load tokens: Check Env Var first (Production), then local file (Dev)
let tokens = null;
if (config.googleTokens) {
    try {
        tokens = JSON.parse(config.googleTokens);
        console.log('🔑 Loaded tokens from environment variable');
    } catch (e) {
        console.error("❌ GOOGLE_TOKENS parse hatası:", e.message);
    }
} else if (fs.existsSync(TOKEN_PATH)) {
    tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    console.log('🔑 Loaded tokens from tokens.json');
}

if (tokens) {
    oauth2Client.setCredentials(tokens);
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// --- AUTH ROUTES ---
app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            res.send('Giriş başarılı! Sunucuyu kapatıp normal kullanıma devam edebilirsiniz.');
        } catch (error) {
            console.error('Token alma hatası:', error);
            res.status(500).send('Giriş başarısız.');
        }
    } else {
        res.status(400).send('Code eksik.');
    }
});

// --- AUTHENTICATION MIDDLEWARE ---

/**
 * Basic HTTP Authentication for admin routes
 */
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;

    if (!auth) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    if (username === config.admin.username && password === config.admin.password) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
}

// --- ADMIN PANEL ROUTES ---

// Serve admin HTML pages WITHOUT auth (auth handled by browser Basic HTTP Auth)
app.get('/admin', (req, res) => {
    // Send login page that will trigger browser basic auth
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication Required');
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    if (username === config.admin.username && password === config.admin.password) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Invalid Credentials');
    }
});

app.get('/admin/orders', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication Required');
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    if (username === config.admin.username && password === config.admin.password) {
        res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Invalid Credentials');
    }
});

// --- TOKEN MANAGEMENT API (with requireAuth) ---
// Apply auth to API routes only

// Get all tokens (for admin monitoring)
app.get('/admin/tokens', requireAuth, (req, res) => {
    try {
        const tokens = tokenManager.getAllTokens();
        res.json({ success: true, tokens: tokens });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate token for customer
app.post('/admin/generate-token', requireAuth, express.json(), (req, res) => {
    const { customerName } = req.body;

    if (!customerName || !customerName.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Müşteri adı gereklidir.'
        });
    }

    try {
        const token = tokenManager.createToken(customerName.trim());
        const orderLink = `${req.protocol}://${req.get('host')}/o/${token}`;

        // Generate WhatsApp message
        const whatsappMessage = generateWhatsAppMessage(customerName.trim(), orderLink);

        res.json({
            success: true,
            token: token,
            link: orderLink,
            whatsappMessage: whatsappMessage
        });
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Token oluşturulamadı.'
        });
    }
});

// Generate WhatsApp-ready message
function generateWhatsAppMessage(customerName, link) {
    return `Merhaba ${customerName},\n\n` +
        `📖 Anı Defteri siparişinizi oluşturmak için aşağıdaki linke tıklayın:\n\n` +
        `${link}\n\n` +
        `ℹ️ Bu link sadece sizin için oluşturulmuştur ve tek kullanımlıktır.\n` +
        `⏰ Link 7 gün geçerlidir.\n\n` +
        `📸 Lütfen en güzel fotoğraflarınızı ve anılarınızı bizimle paylaşın.\n\n` +
        `🔒 KVKK Notu: Yüklediğiniz tüm veriler güvenli olarak saklanır ve sadece sipariş işleme amacıyla kullanılır.\n\n` +
        `Teşekkürler! ❤️`;
}

// Public token-protected order form
app.get('/o/:token', (req, res) => {
    const { token } = req.params;
    const validation = tokenManager.validateToken(token);

    if (!validation.valid) {
        // Show error page
        let errorMessage = 'Geçersiz link.';
        let errorDetails = '';

        if (validation.reason === 'already_used') {
            errorMessage = 'Bu link daha önce kullanılmış.';
            errorDetails = validation.tokenData.orderId ?
                `Sipariş numaranız: <strong>${validation.tokenData.orderId}</strong>` :
                'Sipariş bilgisi bulunamadı.';
        } else if (validation.reason === 'expired') {
            errorMessage = 'Bu linkin süresi dolmuş.';
            errorDetails = 'Lütfen yeni link isteyin.';
        } else {
            errorMessage = 'Bu link geçersiz.';
            errorDetails = 'Link bulunamadı veya bozuk.';
        }

        return res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Link Hatası</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>body { font-family: 'Outfit', sans-serif; }</style>
            </head>
            <body class="bg-slate-100 flex items-center justify-center min-h-screen p-4">
                <div class="bg-white p-10 rounded-3xl shadow-2xl max-w-md text-center">
                    <div class="text-7xl mb-6">⚠️</div>
                    <h1 class="text-3xl font-bold text-slate-800 mb-4">${errorMessage}</h1>
                    <p class="text-slate-600 mb-6">${errorDetails}</p>
                    ${validation.reason === 'already_used' ?
                '<p class="text-sm text-slate-500 mb-6">Siparişiniz zaten oluşturulmuş. Sorularınız için bizimle iletişime geçebilirsiniz.</p>' :
                '<p class="text-sm text-slate-500 mb-6">Yeni bir link almak için satıcınızla iletişime geçin.</p>'}
                    <a href="/" class="inline-block px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition shadow-lg">
                        Ana Sayfa
                    </a>
                </div>
            </body>
            </html>
        `);
    }

    // Valid token - serve order form
    res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

// Get token data for pre-filling form
app.get('/api/token/:token', (req, res) => {
    const { token } = req.params;
    const validation = tokenManager.validateToken(token);

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            error: 'Geçersiz token'
        });
    }

    res.json({
        success: true,
        customerName: validation.tokenData.customerName,
        token: token
    });
});

// --- ORDER MANAGEMENT HELPER FUNCTIONS ---

async function getAllOrdersFromDrive() {
    const rootFolderId = config.drive.rootFolderId ||
        await findOrCreateFolder(config.drive.rootFolderName);

    const orders = [];

    // Get all year folders
    const yearFolders = await listFolders(rootFolderId);

    for (const yearFolder of yearFolders) {
        // Get all month folders
        const monthFolders = await listFolders(yearFolder.id);

        for (const monthFolder of monthFolders) {
            // Get all order folders
            const orderFolders = await listFolders(monthFolder.id);

            for (const orderFolder of orderFolders) {
                try {
                    // Find order.json file
                    const orderJsonFile = await findFileInFolder('order.json', orderFolder.id);

                    if (orderJsonFile) {
                        // Download and parse order.json
                        const orderData = await downloadAndParseJson(orderJsonFile.id);

                        // Count files in subfolders
                        const fileCounts = await getOrderFileCounts(orderFolder.id);

                        orders.push({
                            orderId: orderData.orderId,
                            customerName: orderData.customerName,
                            createdAt: orderData.createdAt,
                            status: orderData.status || 'submitted',
                            folderName: orderFolder.name,
                            folderId: orderFolder.id,
                            driveLink: `https://drive.google.com/drive/folders/${orderFolder.id}`,
                            fileCounts: fileCounts,
                            fields: orderData.fields
                        });
                    }
                } catch (error) {
                    console.error(`Error processing order ${orderFolder.name}:`, error);
                }
            }
        }
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return orders;
}

async function listFolders(parentId) {
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        orderBy: 'name'
    });
    return res.data.files || [];
}

async function findFileInFolder(fileName, folderId) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 1
    });
    return res.data.files && res.data.files.length > 0 ? res.data.files[0] : null;
}

async function downloadAndParseJson(fileId) {
    const res = await drive.files.get({
        fileId: fileId,
        alt: 'media'
    }, { responseType: 'text' });

    return JSON.parse(res.data);
}

async function getOrderFileCounts(orderFolderId) {
    const subfolders = await listFolders(orderFolderId);
    const counts = {};

    for (const folder of subfolders) {
        const files = await drive.files.list({
            q: `'${folder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
            fields: 'files(id)'
        });
        counts[folder.name] = files.data.files ? files.data.files.length : 0;
    }

    return counts;
}

async function findOrderFolder(orderId) {
    const rootFolderId = config.drive.rootFolderId ||
        await findOrCreateFolder(config.drive.rootFolderName);

    const yearFolders = await listFolders(rootFolderId);

    for (const yearFolder of yearFolders) {
        const monthFolders = await listFolders(yearFolder.id);

        for (const monthFolder of monthFolders) {
            const orderFolders = await listFolders(monthFolder.id);

            for (const orderFolder of orderFolders) {
                if (orderFolder.name.includes(orderId)) {
                    return orderFolder;
                }
            }
        }
    }

    return null;
}

async function logStatusChange(orderFolderId, orderId, oldStatus, newStatus, note) {
    const logsFolderId = await findOrCreateFolder('logs', orderFolderId);

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Status changed: ${oldStatus} → ${newStatus}`;
    const logWithNote = note ? `${logEntry}\nNote: ${note}\n\n` : `${logEntry}\n\n`;

    // Append to audit.log
    let auditFile = await findFileInFolder('audit.log', logsFolderId);

    if (auditFile) {
        // Download existing content
        const existingContentRes = await drive.files.get({
            fileId: auditFile.id,
            alt: 'media'
        }, { responseType: 'text' });

        const newContent = existingContentRes.data + logWithNote;

        // Update file
        await drive.files.update({
            fileId: auditFile.id,
            media: {
                mimeType: 'text/plain',
                body: newContent
            }
        });
    } else {
        // Create new audit.log
        await drive.files.create({
            requestBody: {
                name: 'audit.log',
                mimeType: 'text/plain',
                parents: [logsFolderId]
            },
            media: {
                mimeType: 'text/plain',
                body: logWithNote
            }
        });
    }
}

// --- ORDER MANAGEMENT API ---

// Admin dashboard page
app.get('/admin/orders', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Get all orders from Drive
app.get('/api/admin/orders', requireAuth, async (req, res) => {
    try {
        const orders = await getAllOrdersFromDrive();
        res.json({ success: true, orders: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders: ' + error.message
        });
    }
});

// Update order status
app.post('/api/admin/orders/:orderId/status', requireAuth, async (req, res) => {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['submitted', 'psd_done', 'preview_sent', 'approved', 'print_done'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
    }

    try {
        // Find order folder and order.json
        const orderFolder = await findOrderFolder(orderId);
        if (!orderFolder) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const orderJsonFile = await findFileInFolder('order.json', orderFolder.id);
        if (!orderJsonFile) {
            return res.status(404).json({
                success: false,
                error: 'order.json not found'
            });
        }

        // Download current order.json
        const orderData = await downloadAndParseJson(orderJsonFile.id);
        const oldStatus = orderData.status || 'submitted';

        // Update status
        orderData.status = status;
        orderData.lastUpdated = new Date().toISOString();

        // Upload updated order.json
        await drive.files.update({
            fileId: orderJsonFile.id,
            media: {
                mimeType: 'application/json',
                body: JSON.stringify(orderData, null, 2)
            }
        });

        // Log status change to audit trail
        await logStatusChange(orderFolder.id, orderId, oldStatus, status, note);

        console.log(`✅ Status updated: ${orderId} (${oldStatus} → ${status})`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            oldStatus: oldStatus,
            newStatus: status
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status: ' + error.message
        });
    }
});


async function findOrCreateFolder(name, parentId = null) {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    } else {
        // Create
        return await createFolder(name, parentId);
    }
}

async function createFolder(name, parentId = null) {
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
        fileMetadata.parents = [parentId];
    }
    const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });
    return file.data.id;
}

async function uploadFile(name, filePath, mimeType, parentId) {
    const fileMetadata = {
        name: name,
        parents: [parentId],
    };
    const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
    });
    return file.data.id;
}

async function createTextFile(name, content, parentId) {
    const tempPath = path.join('temp_uploads', name);
    if (!fs.existsSync('temp_uploads')) fs.mkdirSync('temp_uploads');
    fs.writeFileSync(tempPath, content);

    const fileId = await uploadFile(name, tempPath, 'text/plain', parentId);
    fs.unlinkSync(tempPath);
    return fileId;
}

// --- API ---

// Rate limiter for order creation endpoint
const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // Max 5 requests per window per IP
    message: {
        success: false,
        error: 'Çok fazla sipariş talebi gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.',
        orderId: null
    },
    standardHeaders: true,      // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,       // Disable `X-RateLimit-*` headers
});

app.post('/api/olustur', orderLimiter, upload.any(), async (req, res) => {
    const cleanupFiles = [];
    if (req.files) req.files.forEach(f => cleanupFiles.push(f.path));

    try {
        if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
            throw new Error("Google Drive yetkisi yok. Lütfen /auth endpointine giderek giriş yapın.");
        }

        const textData = req.body;
        const customerName = textData['musteri_adi'];

        if (!customerName) {
            throw new Error("Dosya İsmi (Müşteri Adı) alanı boş geldi.");
        }

        // Generate unique order ID and metadata
        const orderId = orderUtils.generateOrderId();
        const customerSlug = orderUtils.createCustomerSlug(customerName);
        const orderFolderName = orderUtils.createOrderFolderName(orderId, customerSlug);
        const yearMonthPath = orderUtils.getYearMonthPath(new Date());
        const createdAt = new Date().toISOString();

        console.log(`📦 Yeni Sipariş: ${orderId} - ${customerName}`);

        // 1. Root folder - Ani-Defteri-Siparisler
        const rootFolderId = config.drive.rootFolderId
            ? config.drive.rootFolderId
            : await findOrCreateFolder(config.drive.rootFolderName);

        // 2. Year folder (e.g., "2026")
        const yearFolder = yearMonthPath.split('/')[0];
        const yearFolderId = await findOrCreateFolder(yearFolder, rootFolderId);

        // 3. Month folder (e.g., "02")
        const monthFolder = yearMonthPath.split('/')[1];
        const monthFolderId = await findOrCreateFolder(monthFolder, yearFolderId);

        // 4. Order folder with unique ID
        const mainFolderId = await createFolder(orderFolderName, monthFolderId);
        console.log(`📁 Klasör oluşturuldu: ${yearMonthPath}/${orderFolderName}`);

        // 5. Create subfolder structure
        const genelFolderId = await createFolder('genel', mainFolderId);
        const ozelFolderId = await createFolder('ozel', mainFolderId);
        const outputsFolderId = await createFolder('outputs', mainFolderId);
        const logsFolderId = await createFolder('logs', mainFolderId);

        // 6. Prepare files metadata for order.json
        const filesMetadata = {
            special: {},
            general: []
        };

        // 7. Upload files
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // BULK UPLOAD (General folder)
                if (file.fieldname === '12_Genel_Photos') {
                    const targetName = `Foto_${Date.now()}_${file.originalname}`;
                    filesMetadata.general.push(targetName);
                    await uploadFile(targetName, file.path, file.mimetype, genelFolderId);
                }
                // STANDARD PAGES (Special folder)
                else {
                    const ext = path.extname(file.originalname);
                    const targetName = `${file.fieldname}${ext}`;
                    filesMetadata.special[file.fieldname] = targetName;
                    await uploadFile(targetName, file.path, file.mimetype, ozelFolderId);
                }
            }
        }

        // 8. Create order.json manifest
        const orderManifest = {
            schemaVersion: "1.0",
            orderId: orderId,
            customerName: customerName,
            customerSlug: customerSlug,
            createdAt: createdAt,
            fields: {},
            files: filesMetadata,
            status: "submitted"
        };

        // Add all text fields to manifest
        for (const [key, value] of Object.entries(textData)) {
            if (key !== 'musteri_adi' && value && value.trim() !== "") {
                orderManifest.fields[key] = value;
            }
        }

        // Upload order.json
        await createTextFile('order.json', JSON.stringify(orderManifest, null, 2), mainFolderId);
        console.log('📄 order.json oluşturuldu');

        // 9. Create bilgiler.txt for backward compatibility with Photoshop scripts
        let txtContent = "";
        for (const [key, value] of Object.entries(textData)) {
            if (key !== 'musteri_adi' && value && value.trim() !== "") {
                txtContent += `${key}: ${value}\r\n`;
            }
        }
        await createTextFile('bilgiler.txt', txtContent, mainFolderId);
        console.log('📄 bilgiler.txt oluşturuldu');

        // Mark token as used if order was submitted via token link
        const submittedToken = textData['_token'];
        if (submittedToken) {
            const marked = tokenManager.markTokenUsed(submittedToken, orderId);
            if (marked) {
                console.log(`🔒 Token marked as used: ${submittedToken.substring(0, 16)}...`);
            }
        }

        res.json({
            success: true,
            orderId: orderId,
            message: `Sipariş başarıyla oluşturuldu! Sipariş numarası: ${orderId}`
        });

    } catch (error) {
        console.error("❌ Sipariş Hatası:", error);

        // Provide user-friendly error messages
        let userMessage = "Sunucu hatası oluştu.";

        if (error.message && error.message.includes('Geçersiz dosya tipi')) {
            userMessage = error.message;
        } else if (error.message && error.message.includes('File too large')) {
            userMessage = "Dosya boyutu çok büyük. Maksimum 20MB yükleyebilirsiniz.";
        } else if (error.message && error.message.includes('Too many files')) {
            userMessage = "Çok fazla dosya. Maksimum 50 dosya yükleyebilirsiniz.";
        } else if (error.message && error.message.includes('Google Drive yetkisi')) {
            userMessage = "Sistem hatası. Lütfen yönetici ile iletişime geçin.";
        } else if (error.message) {
            userMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: userMessage,
            orderId: null
        });
    } finally {
        // Temizlik
        cleanupFiles.forEach(p => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
    console.log(`Google Girişi İçin: http://localhost:${PORT}/auth`);
});