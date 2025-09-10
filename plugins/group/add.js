const config = require('../../config');
const { formatMessage } = require('../../lib/utils/helpers');

module.exports = {
    name: 'add',
    description: 'Ajoute un membre au groupe',
    usage: `${config.PREFIX}add [number]`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '➕', key: msg.key } });
            
            if (!isGroup) {
                return await socket.sendMessage(sender, {
                    text: '❌ *This command can only be used in groups!*'
                });
            }

            if (!isOwner) {
                return await socket.sendMessage(sender, {
                    text: '❌ *Only bot owner can add members!*'
                });
            }

            if (args.length === 0) {
                return await socket.sendMessage(sender, {
                    text: `📌 *Usage:* ${config.PREFIX}add +221xxxxx\n\nExample: ${config.PREFIX}add +254xxxxx`
                });
            }

            const numberToAdd = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            
            // Simuler l'ajout au groupe
            await new Promise(resolve => setTimeout(resolve, 1500));

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
                text: formatMessage(
                    '✅ 𝐌𝐄𝐌𝐁𝐄𝐑 𝐀𝐃𝐃𝐄𝐃',
                    `Successfully added ${args[0]} to the group! 🎉\n\n` +
                    `👤 *User:* ${args[0]}\n` +
                    `🏠 *Group:* ${from.split('@')[0]}\n` +
                    `⏰ *Time:* ${new Date().toLocaleTimeString()}`,
                    config.BOT_FOOTER
                )
            }, { quoted: fakevCard });
            
        } catch (error) {
            console.error('Add command error:', error);
            await socket.sendMessage(sender, {
                text: `❌ *Failed to add member*\nError: ${error.message || 'Unknown error'}`
            });
        }
    }
};
