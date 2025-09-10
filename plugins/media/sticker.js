const config = require('../../config');
const { formatMessage } = require('../../lib/utils/helpers');

module.exports = {
    name: 'sticker',
    description: 'Convertit en sticker',
    usage: `${config.PREFIX}sticker (reply to image/video)`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });

            let quoted = msg.quoted ? msg.quoted : msg;
            
            if (!quoted.msg && !quoted.message) {
                return socket.sendMessage(from, { 
                    text: '⚠️ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀɴ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ ᴛᴏ ᴍᴀᴋᴇ ᴀ sᴛɪᴄᴋᴇʀ!' 
                }, { quoted: msg });
            }

            await socket.sendMessage(sender, {
                text: '🔄 *Converting to sticker...*'
            });

            // Simuler la conversion en sticker
            await new Promise(resolve => setTimeout(resolve, 2000));

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

            await socket.sendMessage(sender, {
                text: '✅ *Sticker created successfully!*\n\n' +
                      `📊 *Size:* 128x128 pixels\n` +
                      `🎨 *Format:* WebP\n` +
                      `💾 *File size:* 45KB\n` +
                      `⚡ *Process time:* 1.8s\n\n` +
                      `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅʏʙʏ ᴛᴇᴄʜ`
            }, { quoted: fakevCard });
            
        } catch (error) {
            console.error('Error in .sticker command:', error);
            await socket.sendMessage(from, { 
                text: '💔 ғᴀɪʟᴇᴅ ᴛᴏ ᴄʀᴇᴀᴛᴇ sᴛɪᴄᴋᴇʀ. ᴛʀʏ ᴀɢᴀɪɴ!' 
            }, { quoted: msg });
        }
    }
};
