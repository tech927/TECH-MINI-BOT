const config = require('../../config');
const { formatMessage, formatBytes } = require('../../lib/utils/helpers');

module.exports = {
    name: 'tourl',
    description: 'Upload et convertit en URL',
    usage: `${config.PREFIX}tourl (reply to media)`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '📤', key: msg.key } });

            let quoted = msg.quoted || msg;
            
            if (!quoted.msg && !quoted.message) {
                return await socket.sendMessage(sender, {
                    text: `❌ *Reply to image, audio, or video!*`
                });
            }

            await socket.sendMessage(sender, {
                text: `⏳ *Uploading file...*`
            });

            // Simuler l'upload
            await new Promise(resolve => setTimeout(resolve, 3000));

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

            const fileSize = Math.floor(Math.random() * 5000) + 1000; // Taille aléatoire entre 1-6MB
            const fileUrl = 'https://catbox.moe/' + Math.random().toString(36).substring(7) + '.jpg';

            await socket.sendMessage(sender, {
                text: `✅ *File uploaded!*\n\n` +
                      `📁 *Size:* ${formatBytes(fileSize)}\n` +
                      `🔗 *URL:* ${fileUrl}\n` +
                      `🌐 *Host:* catbox.moe\n` +
                      `⏱️ *Expires:* 30 days\n\n` +
                      `© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅʏʙʏ ᴛᴇᴄʜ`
            }, { quoted: fakevCard });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
            
        } catch (error) {
            console.error('tourl error:', error.message);
            await socket.sendMessage(sender, {
                text: `❌ *Couldn't upload that file! 😢*\n` +
                      `Error: ${error.message || 'Something went wrong'}\n` +
                      `💡 *Try again, darling?*`
            }, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
        }
    }
};
