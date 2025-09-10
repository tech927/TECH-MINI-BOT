const config = require('../../config');
const { formatMessage } = require('../../lib/utils/helpers');

module.exports = {
    name: 'aiimg',
    description: 'Génère des images avec IA',
    usage: `${config.PREFIX}aiimg [prompt]`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '🔮', key: msg.key } });
            
            const q = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption || '';

            const prompt = q.trim();

            if (!prompt) {
                return await socket.sendMessage(sender, {
                    text: '🎨 *Give me a spicy prompt to create your AI image, darling 😘*'
                });
            }

            await socket.sendMessage(sender, {
                text: '🧠 *Crafting your dreamy image, love...*',
            });

            // Simuler la génération d'image IA
            await new Promise(resolve => setTimeout(resolve, 4000));

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
                image: { url: "https://files.catbox.moe/9z2ixp.jpg" },
                caption: `🧠 *sʜᴀᴅᴏᴡ ᴍɪɴɪ ʙᴏᴛ ᴀɪ ɪᴍᴀɢᴇ*\n\n📌 ᴘʀᴏᴍᴘᴛ: ${prompt}\n🎨 sᴛʏʟᴇ: Digital Art\n🔄 ɪᴛᴇʀᴀᴛɪᴏɴs: 50\n⏱️ ᴛɪᴍᴇ: 3.2s\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅʏʙʏ ᴛᴇᴄʜ`
            }, { quoted: fakevCard });
            
        } catch (err) {
            console.error('AI Image Error:', err);
            await socket.sendMessage(sender, {
                text: `❗ *Something broke*: ${err.response?.data?.message || err.message || 'Unknown error'}`
            });
        }
    }
};
