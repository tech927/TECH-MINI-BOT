const { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, delay, getContentType, jidNormalizedUser } = require('@whiskeysockets/baileys');
const { makeWASocket } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const SessionManager = require('./database/sessionManager');
const { setupHandlers } = require('./handlers/eventHandler');

const activeSockets = new Map();
const socketCreationTime = new Map();

async function initializeBot(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(config.SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    
    // Créer le dossier de session si nécessaire
    if (!fs.existsSync(config.SESSION_BASE_PATH)) {
        fs.mkdirSync(config.SESSION_BASE_PATH, { recursive: true });
    }
    
    await SessionManager.cleanDuplicateFiles(sanitizedNumber);

    try {
        const restoredCreds = await SessionManager.restoreSession(sanitizedNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        if (restoredCreds) {
            state.creds = restoredCreds;
            fs.ensureDirSync(sessionPath);
            fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
            console.log(`✅ Successfully restored session for ${sanitizedNumber}`);
        }

        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino()),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'fatal' }),
            browser: Browsers.macOS('Safari')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        // Configurer tous les handlers
        setupHandlers(socket, sanitizedNumber, saveCreds);

        // Gérer le pairing si nécessaire
        if (!socket.authState.creds.registered) {
            await handlePairing(socket, sanitizedNumber, res);
        }

        // Gérer la mise à jour des credentials
        socket.ev.on('creds.update', async () => {
            await saveCreds();
            await SessionManager.saveSessionToGitHub(sanitizedNumber, state.creds);
        });

        // Gérer les mises à jour de connexion
        socket.ev.on('connection.update', async (update) => {
            await handleConnectionUpdate(socket, sanitizedNumber, update, res);
        });

        activeSockets.set(sanitizedNumber, socket);
        return socket;

    } catch (error) {
        console.error('Initialization error:', error);
        if (!res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
        throw error;
    }
}

async function handlePairing(socket, number, res) {
    let retries = config.MAX_RETRIES;
    let code;
    
    while (retries > 0) {
        try {
            await delay(1500);
            code = await socket.requestPairingCode(number);
            break;
        } catch (error) {
            retries--;
            console.warn(`Failed to request pairing code: ${retries}, ${error.message}`, retries);
            await delay(2000 * (config.MAX_RETRIES - retries));
        }
    }
    
    if (code && !res.headersSent) {
        res.send({ code });
    }
}

async function handleConnectionUpdate(socket, number, update, res) {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
        console.log(`✅ Bot ${number} connected successfully`);
        await onConnected(socket, number);
    } else if (connection === 'close') {
        console.log(`❌ Bot ${number} disconnected`);
        await onDisconnected(number, lastDisconnect, res);
    }
}

async function onConnected(socket, number) {
    try {
        const userJid = jidNormalizedUser(socket.user.id);
        
        // Rejoindre le groupe configuré
        const groupResult = await joinGroup(socket);
        
        // Charger la configuration utilisateur
        const userConfig = await SessionManager.loadUserConfig(number);
        
        // Envoyer message de bienvenue
        const groupStatus = groupResult.status === 'success' 
            ? 'ᴊᴏɪɴᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ' 
            : `ғᴀɪʟᴇᴅ ᴛᴏ ᴊᴏɪɴ ɢʀᴏᴜᴘ: ${groupResult.error}`;

        await socket.sendMessage(userJid, {
            image: { url: config.RCD_IMAGE_PATH },
            caption: formatMessage(
                '👻 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sʜᴀᴅᴏᴡ ᴍɪɴɪ ʙᴏᴛ 👻',
                `✅ sᴜᴄᴄᴇssғᴜʟʟʏ ᴄᴏɴɴᴇᴄᴛᴇᴅ!\n\n` +
                `🔢 ɴᴜᴍʙᴇʀ: ${number}\n` +
                `🏠 ɢʀᴏᴜᴘ sᴛᴀᴛᴜs: ${groupStatus}\n` +
                `⏰ ᴄᴏɴɴᴇᴄᴛᴇᴅ: ${new Date().toLocaleString()}\n\n` +
                `📢 ғᴏʟʟᴏᴡ ᴍᴀɪɴ ᴄʜᴀɴɴᴇʟ 👇\n` +
                `${config.CHANNEL_LINK}\n\n` +
                `🤖 ᴛʏᴘᴇ *${config.PREFIX}menu* ᴛᴏ ɢᴇᴛ sᴛᴀʀᴛᴇᴅ!`,
                config.BOT_FOOTER
            )
        });

        // Envoyer message aux admins
        await sendAdminConnectMessage(socket, number, groupResult);
        
        // Mettre à jour la liste des numéros
        await updateNumberList(number);

    } catch (error) {
        console.error('Connection setup error:', error);
    }
}

async function onDisconnected(number, lastDisconnect, res) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    if (statusCode === 401) {
        // Logout utilisateur, nettoyer la session
        console.log(`User ${number} logged out. Cleaning session...`);
        await SessionManager.deleteSessionFromGitHub(number);
        
        // Supprimer le dossier de session local
        const sessionPath = path.join(config.SESSION_BASE_PATH, `session_${number.replace(/[^0-9]/g, '')}`);
        if (fs.existsSync(sessionPath)) {
            fs.removeSync(sessionPath);
        }
    } else {
        // Tentative de reconnexion
        console.log(`Attempting to reconnect ${number}...`);
        await delay(10000);
    }
    
    // Nettoyer les sockets actifs
    if (activeSockets.has(number)) {
        activeSockets.delete(number);
    }
    socketCreationTime.delete(number);
}

async function joinGroup(socket) {
    let retries = config.MAX_RETRIES || 3;
    let inviteCode = 'CehDJZixGGA2LBA7EgUGaL'; // Default
    
    if (config.GROUP_INVITE_LINK) {
        const cleanInviteLink = config.GROUP_INVITE_LINK.split('?')[0];
        const inviteCodeMatch = cleanInviteLink.match(/chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/);
        if (inviteCodeMatch) {
            inviteCode = inviteCodeMatch[1];
        }
    }
    
    console.log(`Attempting to join group with invite code: ${inviteCode}`);

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            if (response?.gid) {
                console.log(`[ ✅ ] Successfully joined group with ID: ${response.gid}`);
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            let errorMessage = error.message || 'Unknown error';
            console.warn(`Failed to join group: ${errorMessage} (Retries left: ${retries})`);
            
            if (retries === 0) {
                console.error('[ ❌ ] Failed to join group', { error: errorMessage });
                return { status: 'failed', error: errorMessage };
            }
            await delay(2000 * (config.MAX_RETRIES - retries + 1));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}

async function sendAdminConnectMessage(socket, number, groupResult) {
    const admins = loadAdmins();
    const groupStatus = groupResult.status === 'success'
        ? `Joined (ID: ${groupResult.gid})`
        : `Failed to join group: ${groupResult.error}`;
    
    const caption = formatMessage(
        '*ᴄᴏɴɴᴇᴄᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟ ✅*',
        `📞 ɴᴜᴍʙᴇʀ: ${number}\n🩵 sᴛᴀᴛᴜs: Online\n🏠 ɢʀᴏᴜᴘ sᴛᴀᴛᴜs: ${groupStatus}\n⏰ ᴄᴏɴɴᴇᴄᴛᴇᴅ: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}`,
        config.BOT_FOOTER
    );

    for (const admin of admins) {
        try {
            await socket.sendMessage(
                `${admin}@s.whatsapp.net`,
                { image: { url: config.IMAGE_PATH }, caption }
            );
            console.log(`Connect message sent to admin ${admin}`);
        } catch (error) {
            console.error(`Failed to send connect message to admin ${admin}:`, error.message);
        }
    }
}

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

async function updateNumberList(number) {
    let numbers = [];
    try {
        if (fs.existsSync(config.NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(config.NUMBER_LIST_PATH, 'utf8'));
        }
        
        if (!numbers.includes(number)) {
            numbers.push(number);
            fs.writeFileSync(config.NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
            await SessionManager.updateNumberListOnGitHub(number);
        }
    } catch (error) {
        console.error('Failed to update number list:', error);
    }
}

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

module.exports = {
    initializeBot,
    activeSockets,
    socketCreationTime
};
