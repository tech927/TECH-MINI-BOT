const config = require('../../config');
const messageHandler = require('./messageHandler');
const statusHandler = require('./statusHandler');
const newsletterHandler = require('./newsletterHandler');
const { activeSockets } = require('../connection');
const SessionManager = require('../database/sessionManager');

function setupHandlers(socket, number, saveCreds) {
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
}

function handleConnectionUpdate(socket, number, update) {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
        console.log(`✅ Bot ${number} connected successfully`);
        handleConnected(socket, number);
    } else if (connection === 'close') {
        console.log(`❌ Bot ${number} disconnected`);
        handleDisconnection(number, lastDisconnect);
    }
}

async function handleConnected(socket, number) {
    try {
        // Sauvegarder la session sur GitHub
        await SessionManager.saveSessionToGitHub(number, socket.authState.creds);
        
        // Rejoindre le groupe configuré
        const groupResult = await joinGroup(socket);
        
        // Charger la configuration utilisateur
        const userConfig = await SessionManager.loadUserConfig(number);
        
        console.log(`✅ Bot ${number} fully initialized and ready`);
        
    } catch (error) {
        console.error('Connection setup error:', error);
    }
}

function handleDisconnection(number, lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    if (statusCode === 401) {
        // Logout utilisateur, nettoyer la session
        console.log(`User ${number} logged out. Cleaning session...`);
        SessionManager.deleteSessionFromGitHub(number);
    }
    
    // Nettoyer les sockets actifs
    if (activeSockets.has(number)) {
        activeSockets.delete(number);
    }
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
            await delay(2000 * (config.MAX_RETRIES - retries + 1));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}

function setupMessageRevocationHandler(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;

        const messageKey = keys[0];
        const userJid = jidNormalizedUser(socket.user.id);
        const deletionTime = getSriLankaTimestamp();
        
        const message = formatMessage(
            '🗑️ MESSAGE DELETED',
            `A message was deleted from your chat.\n📋 From: ${messageKey.remoteJid}\n🍁 Deletion Time: ${deletionTime}`,
            'sʜᴀᴅᴏᴡ ᴍɪɴɪ ʙᴏᴛ'
        );

        try {
            await socket.sendMessage(userJid, {
                image: { url: config.RCD_IMAGE_PATH },
                caption: message
            });
            console.log(`Notified ${number} about message deletion: ${messageKey.id}`);
        } catch (error) {
            console.error('Failed to send deletion notification:', error);
        }
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jidNormalizedUser(jid) {
    return jid.split(':')[0] + '@s.whatsapp.net';
}

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function getSriLankaTimestamp() {
    const moment = require('moment-timezone');
    return moment().tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss');
}

module.exports = {
    setupHandlers
};
