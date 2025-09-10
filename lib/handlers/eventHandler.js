const config = require('../../config');
const messageHandler = require('./messageHandler');
const statusHandler = require('./statusHandler');
const newsletterHandler = require('./newsletterHandler');
const { activeSockets } = require('../connection');
const SessionManager = require('../database/sessionManager');
const { delay, formatMessage, getSriLankaTimestamp } = require('../utils/helpers');

function setupHandlers(socket, number, saveCreds) {
    console.log(`🛠️ Setting up handlers for ${number}`);
    
    // Handler de mise à jour des credentials
    socket.ev.on('creds.update', saveCreds);
    
    // Handler de connexion
    socket.ev.on('connection.update', (update) => {
        handleConnectionUpdate(socket, number, update);
    });
    
    // Handler de messages
    socket.ev.on('messages.upsert', async (data) => {
        await messageHandler.handleMessages(socket, data, number);
    });
    
    // Handler de status
    statusHandler.setupStatusHandlers(socket);
    
    // Handler de newsletters
    newsletterHandler.setupNewsletterHandlers(socket);
    
    // Handler de suppression de messages
    setupMessageRevocationHandler(socket, number);
    
    console.log(`✅ Handlers setup completed for ${number}`);
}

function handleConnectionUpdate(socket, number, update) {
    const { connection, lastDisconnect, qr } = update;
    
    console.log(`🔗 Connection update for ${number}:`, { 
        connection, 
        statusCode: lastDisconnect?.error?.output?.statusCode,
        hasQR: !!qr 
    });
    
    if (connection === 'open') {
        console.log(`✅ Bot ${number} connected successfully`);
        handleConnected(socket, number);
    } else if (connection === 'close') {
        console.log(`❌ Bot ${number} disconnected`);
        handleDisconnection(number, lastDisconnect);
    } else if (qr) {
        console.log(`📋 QR code generated for ${number}`);
        // Le QR code est généré, attendre le scanning
    } else if (connection === 'connecting') {
        console.log(`🔄 Bot ${number} is connecting...`);
    }
}

async function handleConnected(socket, number) {
    try {
        console.log(`💾 Saving session to GitHub for ${number}`);
        // Sauvegarder la session sur GitHub
        await SessionManager.saveSessionToGitHub(number, socket.authState.creds);
        
        console.log(`🏠 Joining group for ${number}`);
        // Rejoindre le groupe configuré
        const groupResult = await joinGroup(socket);
        
        console.log(`⚙️ Loading config for ${number}`);
        // Charger la configuration utilisateur
        const userConfig = await SessionManager.loadUserConfig(number);
        
        console.log(`✅ Bot ${number} fully initialized and ready`);
        
    } catch (error) {
        console.error('❌ Connection setup error:', error.message);
    }
}

function handleDisconnection(number, lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    console.log(`🔌 Disconnection details for ${number}:`, { 
        statusCode,
        error: lastDisconnect?.error?.message 
    });
    
    if (statusCode === 401) {
        // Logout utilisateur, nettoyer la session
        console.log(`🚮 User ${number} logged out. Cleaning session...`);
        try {
            SessionManager.deleteSessionFromGitHub(number);
        } catch (error) {
            console.error('❌ Failed to delete session from GitHub:', error.message);
        }
    }
    
    // Nettoyer les sockets actifs - vérification sécurisée
    try {
        if (activeSockets && activeSockets.has && activeSockets.has(number)) {
            activeSockets.delete(number);
        }
    } catch (error) {
        console.error('❌ Error cleaning active sockets:', error.message);
    }
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
        console.log('ℹ️ No group invite link configured');
        return { status: 'skipped', error: 'No group invite link' };
    }
    
    console.log(`🔗 Joining group with code: ${inviteCode}`);

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            if (response?.gid) {
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            if (retries === 0) {
                return { status: 'failed', error: error.message };
            }
            await delay(2000);
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}

function setupMessageRevocationHandler(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;

        const messageKey = keys[0];
        const userJid = `${number}@s.whatsapp.net`;
        const deletionTime = getSriLankaTimestamp();
        
        const message = formatMessage(
            '🗑️ MESSAGE DELETED',
            `A message was deleted from your chat.\n📋 From: ${messageKey.remoteJid}\n⏰ Deletion Time: ${deletionTime}`,
            config.BOT_FOOTER
        );

        try {
            await socket.sendMessage(userJid, {
                image: { url: config.RCD_IMAGE_PATH },
                caption: message
            });
            console.log(`📩 Notified ${number} about message deletion: ${messageKey.id}`);
        } catch (error) {
            console.error('❌ Failed to send deletion notification:', error.message);
        }
    });
}

module.exports = {
    setupHandlers
};
