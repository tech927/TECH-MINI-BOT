const { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, delay } = require('@whiskeysockets/baileys');
const { makeWASocket } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const SessionManager = require('./database/sessionManager');
const { setupHandlers } = require('./handlers/eventHandler');

// Déclaration des maps globaux
const activeSockets = new Map();
const socketCreationTime = new Map();

async function initializeBot(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(config.SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    
    console.log(`🔧 Initializing bot for number: ${sanitizedNumber}`);
    
    // Créer le dossier de session si nécessaire
    if (!fs.existsSync(config.SESSION_BASE_PATH)) {
        fs.mkdirSync(config.SESSION_BASE_PATH, { recursive: true });
    }
    
    // Nettoyer le dossier de session local avant de commencer
    if (fs.existsSync(sessionPath)) {
        console.log(`🧹 Cleaning existing session directory: ${sessionPath}`);
        try {
            fs.removeSync(sessionPath);
        } catch (error) {
            console.error('❌ Failed to clean session directory:', error.message);
        }
    }
    fs.ensureDirSync(sessionPath);

    try {
        let authState;
        let saveCreds;
        
        // Essayer de restaurer depuis GitHub d'abord
        console.log(`🔄 Attempting to restore session from GitHub for ${sanitizedNumber}`);
        const restoredCreds = await SessionManager.restoreSession(sanitizedNumber);
        
        if (restoredCreds && restoredCreds.registered) {
            console.log(`✅ Using restored session for ${sanitizedNumber}`);
            // Utiliser les credentials restaurés
            authState = {
                state: {
                    creds: restoredCreds,
                    keys: { get: () => [], set: () => {} }
                },
                saveCreds: () => Promise.resolve()
            };
            saveCreds = async () => {
                await SessionManager.saveSessionToGitHub(sanitizedNumber, restoredCreds);
            };
        } else {
            console.log(`🆕 Creating new session for ${sanitizedNumber}`);
            // Créer une nouvelle session
            authState = await useMultiFileAuthState(sessionPath);
            saveCreds = authState.saveCreds;
        }

        const socket = makeWASocket({
            auth: {
                creds: authState.state.creds,
                keys: makeCacheableSignalKeyStore(authState.state.keys, pino()),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Safari'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            shouldIgnoreJid: jid => jid?.endsWith('@broadcast')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        // Configurer tous les handlers
        setupHandlers(socket, sanitizedNumber, saveCreds);

        // Gérer le pairing si nécessaire
        if (!socket.authState.creds.registered) {
            console.log(`🔐 Number ${sanitizedNumber} is not registered, requesting pairing code`);
            await handlePairing(socket, sanitizedNumber, res, authState);
        } else {
            console.log(`✅ Number ${sanitizedNumber} is already registered`);
            // Déjà enregistré, envoyer le statut de connexion
            if (res && !res.headersSent) {
                res.send({ 
                    status: 'already_registered', 
                    message: 'Number is already registered and connected' 
                });
            }
        }

        // Gérer la mise à jour des credentials
        socket.ev.on('creds.update', async () => {
            try {
                console.log(`📦 Credentials updated for ${sanitizedNumber}, saving...`);
                await saveCreds();
                await SessionManager.saveSessionToGitHub(sanitizedNumber, socket.authState.creds);
                console.log(`✅ Credentials saved for ${sanitizedNumber}`);
            } catch (error) {
                console.error('❌ Failed to save credentials:', error.message);
            }
        });

        activeSockets.set(sanitizedNumber, socket);
        console.log(`✅ Bot initialized successfully for ${sanitizedNumber}`);
        return socket;

    } catch (error) {
        console.error('❌ Initialization error:', error.message);
        if (res && !res.headersSent) {
            res.status(500).send({ 
                error: 'Failed to initialize bot: ' + error.message,
                code: 'INITIALIZATION_FAILED'
            });
        }
        // Nettoyer en cas d'erreur
        if (activeSockets.has(sanitizedNumber)) {
            activeSockets.delete(sanitizedNumber);
        }
        socketCreationTime.delete(sanitizedNumber);
        throw error;
    }
}

async function handlePairing(socket, number, res, authState) {
    console.log(`📋 Requesting pairing code for ${number}`);
    
    try {
        let code;
        let retries = 3;
        
        // Tentative multiple pour obtenir le code pairing - COMME DANS LE CODE FONCTIONNEL
        while (retries > 0) {
            try {
                await delay(1500);
                code = await socket.requestPairingCode(number);
                break;
            } catch (error) {
                retries--;
                console.warn(`Failed to request pairing code: ${retries}, ${error.message}`, retries);
                if (retries === 0) throw error;
                await delay(2000 * (3 - retries));
            }
        }
        
        console.log(`✅ Pairing code generated for ${number}: ${code}`);
        
        if (res && !res.headersSent) {
            res.send({ 
                status: 'pairing_required', 
                code: code,
                message: 'Please enter this code in WhatsApp within 60 seconds',
                number: number
            });
        }

        // Attendre la connexion avec un timeout plus long - COMME DANS LE CODE FONCTIONNEL
        const connectionPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Pairing timeout: Code expired or not used'));
            }, 60000); // 60 secondes timeout

            const connectionHandler = (update) => {
                console.log(`🔗 Connection update during pairing: ${update.connection}`);
                
                if (update.connection === 'open') {
                    console.log(`✅ Pairing successful for ${number}`);
                    clearTimeout(timeout);
                    socket.ev.off('connection.update', connectionHandler);
                    resolve(true);
                } else if (update.connection === 'close') {
                    const statusCode = update.lastDisconnect?.error?.output?.statusCode;
                    console.log(`❌ Connection closed during pairing: ${statusCode}`);
                    clearTimeout(timeout);
                    socket.ev.off('connection.update', connectionHandler);
                    reject(new Error(`Connection closed: ${statusCode}`));
                }
            };

            socket.ev.on('connection.update', connectionHandler);
        });

        await connectionPromise;
        
        // Sauvegarder les credentials après pairing réussi
        console.log(`💾 Saving credentials after successful pairing for ${number}`);
        try {
            await authState.saveCreds();
            await SessionManager.saveSessionToGitHub(number, socket.authState.creds);
        } catch (saveError) {
            console.error('❌ Failed to save credentials:', saveError.message);
            // Continuer même si la sauvegarde échoue
        }
        
        // Mettre à jour la liste des numéros
        try {
            await updateNumberList(number);
        } catch (updateError) {
            console.error('❌ Failed to update number list:', updateError.message);
        }
        
        console.log(`🎉 Pairing process completed successfully for ${number}`);

    } catch (error) {
        console.error(`❌ Pairing failed for ${number}:`, error.message);
        if (res && !res.headersSent) {
            try {
                res.status(500).send({ 
                    error: 'Pairing failed: ' + error.message,
                    code: 'PAIRING_FAILED'
                });
            } catch (sendError) {
                console.error('❌ Failed to send error response:', sendError.message);
            }
        }
        throw error;
    }
}

async function onConnected(socket, number) {
    try {
        const userJid = `${number}@s.whatsapp.net`;
        
        console.log(`🏠 Attempting to join group for ${number}`);
        // Rejoindre le groupe configuré
        const groupResult = await joinGroup(socket);
        
        // Charger la configuration utilisateur
        const userConfig = await SessionManager.loadUserConfig(number);
        
        // Envoyer message de bienvenue
        const groupStatus = groupResult.status === 'success' 
            ? '✅ Joined successfully' 
            : `❌ Failed to join group: ${groupResult.error}`;

        const welcomeMessage = `*👻 WELCOME TO ${config.BOT_NAME} 👻*\n\n` +
            `✅ Successfully connected!\n\n` +
            `🔢 Number: ${number}\n` +
            `🏠 Group status: ${groupStatus}\n` +
            `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
            `📢 Follow main channel 👇\n` +
            `${config.CHANNEL_LINK}\n\n` +
            `🤖 Type *${config.PREFIX}menu* to get started!\n\n` +
            `> *${config.BOT_FOOTER}*`;

        await socket.sendMessage(userJid, {
            image: { url: config.RCD_IMAGE_PATH },
            caption: welcomeMessage
        });

        // Envoyer message aux admins
        await sendAdminConnectMessage(socket, number, groupResult);
        
        console.log(`✅ Welcome message sent to ${number}`);

    } catch (error) {
        console.error('❌ Connection setup error:', error.message);
    }
}

async function onDisconnected(number, lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    console.log(`🔌 Disconnection for ${number}:`, { 
        statusCode,
        error: lastDisconnect?.error?.message 
    });
    
    if (statusCode === 401) {
        // Logout utilisateur, nettoyer la session
        console.log(`🚮 User ${number} logged out. Cleaning session...`);
        try {
            await SessionManager.deleteSessionFromGitHub(number);
        } catch (error) {
            console.error('❌ Failed to delete session from GitHub:', error.message);
        }
        
        // Supprimer le dossier de session local
        const sessionPath = path.join(config.SESSION_BASE_PATH, `session_${number.replace(/[^0-9]/g, '')}`);
        if (fs.existsSync(sessionPath)) {
            try {
                fs.removeSync(sessionPath);
            } catch (error) {
                console.error('❌ Failed to remove session directory:', error.message);
            }
        }
    }
    
    // Nettoyer les sockets actifs
    if (activeSockets.has(number)) {
        activeSockets.delete(number);
    }
    socketCreationTime.delete(number);
    console.log(`🧹 Cleaned up resources for ${number}`);
}

async function joinGroup(socket) {
    let retries = config.MAX_RETRIES || 3;
    let inviteCode = '';
    
    if (config.GROUP_INVITE_LINK) {
        const cleanInviteLink = config.GROUP_INVITE_LINK.split('?')[0];
        const inviteCodeMatch = cleanInviteLink.match(/chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/);
        if (inviteCodeMatch) {
            inviteCode = inviteCodeMatch[1];
        }
    }
    
    if (!inviteCode) {
        console.log('ℹ️ No valid group invite code found');
        return { status: 'skipped', error: 'No group invite link configured' };
    }
    
    console.log(`🔗 Attempting to join group with invite code: ${inviteCode}`);

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            if (response?.gid) {
                console.log(`✅ Successfully joined group with ID: ${response.gid}`);
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            let errorMessage = error.message || 'Unknown error';
            console.warn(`❌ Failed to join group: ${errorMessage} (Retries left: ${retries})`);
            
            if (retries === 0) {
                console.error('❌ Failed to join group after all retries');
                return { status: 'failed', error: errorMessage };
            }
            await delay(2000);
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}

async function sendAdminConnectMessage(socket, number, groupResult) {
    const admins = loadAdmins();
    if (admins.length === 0) {
        console.log('ℹ️ No admins configured');
        return;
    }
    
    const groupStatus = groupResult.status === 'success'
        ? `✅ Joined (ID: ${groupResult.gid})`
        : `❌ Failed to join group: ${groupResult.error}`;
    
    const adminMessage = `*🤖 BOT CONNECTED SUCCESSFULLY ✅*\n\n` +
        `📞 Number: ${number}\n` +
        `🟢 Status: Online\n` +
        `🏠 Group status: ${groupStatus}\n` +
        `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
        `> *${config.BOT_FOOTER}*`;

    for (const admin of admins) {
        try {
            await socket.sendMessage(
                `${admin}@s.whatsapp.net`,
                { image: { url: config.IMAGE_PATH }, caption: adminMessage }
            );
            console.log(`📤 Connect message sent to admin ${admin}`);
        } catch (error) {
            console.error(`❌ Failed to send connect message to admin ${admin}:`, error.message);
        }
    }
}

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            const admins = JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
            return Array.isArray(admins) ? admins : [];
        }
        return [];
    } catch (error) {
        console.error('❌ Failed to load admin list:', error.message);
        return [];
    }
}

async function updateNumberList(number) {
    try {
        let numbers = [];
        if (fs.existsSync(config.NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(config.NUMBER_LIST_PATH, 'utf8'));
        }
        
        if (!numbers.includes(number)) {
            numbers.push(number);
            fs.writeFileSync(config.NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
            await SessionManager.updateNumberListOnGitHub(number);
            console.log(`✅ Added ${number} to numbers list`);
        }
    } catch (error) {
        console.error('❌ Failed to update number list:', error.message);
    }
}

module.exports = {
    initializeBot,
    activeSockets: activeSockets,
    socketCreationTime: socketCreationTime
};
