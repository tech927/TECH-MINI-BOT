const config = require('../../config');
const { sms } = require('../utils/msg');
const { getContentType, jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Charger tous les plugins
const plugins = loadPlugins();

async function handleMessages(socket, data, number) {
    const { messages } = data;
    const msg = messages[0];
    
    if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

    const m = sms(socket, msg);
    const type = getContentType(msg.message);
    
    if (!msg.message) return;
    
    msg.message = (type === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
    
    const body = getMessageBody(msg, type);
    const sender = msg.key.remoteJid;
    const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net' || socket.user.id) : (msg.key.participant || msg.key.remoteJid);
    const senderNumber = nowsender.split('@')[0];
    const developers = `${config.OWNER_NUMBER}`;
    const botNumber = socket.user.id.split(':')[0];
    const isbot = botNumber.includes(senderNumber);
    const isOwner = isbot ? isbot : developers.includes(senderNumber);
    const prefix = config.PREFIX;
    const isCmd = body.startsWith(prefix);
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '.';
    const args = body.trim().split(/ +/).slice(1);

    if (!isCmd) return;

    try {
        // Exécuter la commande si elle existe dans les plugins
        if (plugins[command]) {
            await plugins[command].execute(socket, m, args, {
                isOwner,
                isGroup,
                sender,
                from,
                number
            });
        } else {
            // Commande non trouvée
            await socket.sendMessage(sender, {
                text: `❌ Commande *${command}* non trouvée. Tapez *${prefix}menu* pour voir les commandes disponibles.`
            });
        }
    } catch (error) {
        console.error('Command execution error:', error);
        await socket.sendMessage(sender, {
            text: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
        });
    }
}

function getMessageBody(msg, type) {
    return (type === 'conversation') ? msg.message.conversation 
        : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') 
            ? msg.message.extendedTextMessage.text 
        : (type == 'interactiveResponseMessage') 
            ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage 
                && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id 
        : (type == 'templateButtonReplyMessage') 
            ? msg.message.templateButtonReplyMessage?.selectedId 
        : (type === 'extendedTextMessage') 
            ? msg.message.extendedTextMessage.text 
        : (type == 'imageMessage') && msg.message.imageMessage.caption 
            ? msg.message.imageMessage.caption 
        : (type == 'videoMessage') && msg.message.videoMessage.caption 
            ? msg.message.videoMessage.caption 
        : (type == 'buttonsResponseMessage') 
            ? msg.message.buttonsResponseMessage?.selectedButtonId 
        : (type == 'listResponseMessage') 
            ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
        : (type == 'messageContextInfo') 
            ? (msg.message.buttonsResponseMessage?.selectedButtonId 
                || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                || msg.text) 
        : (type === 'viewOnceMessage') 
            ? msg.message[type]?.message[getContentType(msg.message[type].message)] 
        : (type === "viewOnceMessageV2") 
            ? (msg.message[type]?.message?.imageMessage?.caption || msg.message[type]?.message?.videoMessage?.caption || "") 
        : '';
}

function loadPlugins() {
    const pluginsDir = path.join(__dirname, '../../plugins');
    const plugins = {};
    
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        return plugins;
    }
    
    // Charger les plugins par catégorie
    const categories = fs.readdirSync(pluginsDir);
    
    for (const category of categories) {
        const categoryPath = path.join(pluginsDir, category);
        if (fs.statSync(categoryPath).isDirectory()) {
            const pluginFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            for (const file of pluginFiles) {
                try {
                    const pluginPath = path.join(categoryPath, file);
                    const plugin = require(pluginPath);
                    
                    if (plugin.name && typeof plugin.execute === 'function') {
                        plugins[plugin.name] = plugin;
                        console.log(`✅ Plugin chargé: ${plugin.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Erreur lors du chargement du plugin ${file}:`, error);
                }
            }
        }
    }
    
    return plugins;
}

module.exports = {
    handleMessages
};
