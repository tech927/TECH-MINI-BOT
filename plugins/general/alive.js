const config = require('../../config');
const { formatMessage, formatBytes } = require('../../lib/utils/helpers');
const os = require('os');

module.exports = {
    name: 'alive',
    description: 'Vérifie si le bot est en ligne',
    usage: `${config.PREFIX}alive`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '🔮', key: msg.key } });
            
            const startTime = global.socketCreationTime?.get(number.replace(/[^0-9]/g, '')) || Date.now();
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const captionText = `
*╭───〘 sʜᴀᴅᴏᴡ ᴀʟɪᴠᴇ 〙───⊷*
*┃* ʙᴏᴛ ᴜᴘᴛɪᴍᴇ: ${hours}ʜ ${minutes}ᴍ ${seconds}s
*┃* ᴀᴄᴛɪᴠᴇ ʙᴏᴛs: ${Object.keys(global.activeSockets || {}).length}
*┃* ʏᴏᴜʀ ɴᴜᴍʙᴇʀ: ${number}
*┃* ᴠᴇʀsɪᴏɴ: ${config.VERSION}
*┃* ᴍᴇᴍᴏʀʏ ᴜsᴀɢᴇ: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}ᴍʙ
*╰───────────────┈⊷*

> *▫️sʜᴀᴅᴏᴡ ᴍɪɴɪ ᴍᴀɪɴ*
> ʀᴇsᴘᴏɴᴅ ᴛɪᴍᴇ: ${Date.now() - msg.messageTimestamp * 1000}ms`;

            const fakevCard = {
                key: {
                    fromMe: false,
                    participant: "0@s.whatsapp.net",
                    remoteJid: "status@broadcast"
                },
                message: {
                    contactMessage: {
                        displayName: "© sʜᴀᴅᴏᴡ ᴠᴇʀɪғɪᴇᴅ ✅",
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=254101022551:+254101022551\nEND:VCARD`
                    }
                }
            };

            const aliveMessage = {
                image: { url: "https://files.catbox.moe/9z2ixp.jpg" },
                caption: `> ᴀᴍ ᴀʟɪᴠᴇ ɴɴ ᴋɪᴄᴋɪɴɢ 👾\n\n${captionText}`,
                buttons: [
                    {
                        buttonId: `${config.PREFIX}menu`,
                        buttonText: { displayText: '📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴ' },
                        type: 1
                    },
                    { 
                        buttonId: `${config.PREFIX}bot_stats`, 
                        buttonText: { displayText: '🌟 ʙᴏᴛ sᴛᴀᴛs' }, 
                        type: 1 
                    },
                    { 
                        buttonId: `${config.PREFIX}bot_info`, 
                        buttonText: { displayText: '🌸 ʙᴏᴛ ɪɴғᴏ' }, 
                        type: 1 
                    }
                ],
                headerType: 1,
                viewOnce: true
            };

            await socket.sendMessage(from, aliveMessage, { quoted: fakevCard });
            
        } catch (error) {
            console.error('Alive command error:', error);
            const startTime = global.socketCreationTime?.get(number.replace(/[^0-9]/g, '')) || Date.now();
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            await socket.sendMessage(from, {
                image: { url: "https://files.catbox.moe/9z2ixp.jpg" },
                caption: `*🤖 sʜᴀᴅᴏᴡ ᴍɪɴɪ ᴀʟɪᴠᴇ*\n\n` +
                        `*┏────〘 sʜᴀᴅᴏᴡ 〙───⊷*\n` +
                        `*┃* ᴜᴘᴛɪᴍᴇ: ${hours}h ${minutes}m ${seconds}s\n` +
                        `*┃* sᴛᴀᴛᴜs: ᴏɴʟɪɴᴇ\n` +
                        `*┃* ɴᴜᴍʙᴇʀ: ${number}\n` +
                        `*┗──────────────⊷*\n\n` +
                        `ᴛʏᴘᴇ *${config.PREFIX}ᴍᴇɴᴜ* ғᴏʀ ᴄᴏᴍᴍᴀɴᴅs`
            }, { quoted: fakevCard });
        }
    }
};
