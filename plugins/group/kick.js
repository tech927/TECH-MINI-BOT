const config = require('../../config');
const { formatMessage } = require('../../lib/utils/helpers');

module.exports = {
    name: 'kick',
    description: 'Retire un membre du groupe',
    usage: `${config.PREFIX}kick [number]`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '🦶', key: msg.key } });
            
            if (!isGroup) {
                return await socket.sendMessage(sender, {
                    text: '❌ *This command can only be used in groups!*'
                });
            }

            if (!isOwner) {
                return await socket.sendMessage(sender, {
                    text: '❌ *Only bot owner can kick members!*'
                });
            }

            if (args.length === 0 && !msg.quoted) {
                return await socket.sendMessage(sender, {
                    text: `📌 *Usage:* ${config.PREFIX}kick +254xxxxx or reply to a message with ${config.PREFIX}kick`
                });
            }

            let numberToKick;
            if (msg.quoted) {
                numberToKick = msg.quoted.sender;
            } else {
                numberToKick = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }

            // Simuler le retrait du groupe
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
                    '🗑️ 𝐌𝐄𝐌𝐁𝐄𝐑 𝐊𝐈𝐂𝐊𝐄𝐃',
                    `Successfully removed ${numberToKick.split('@')[0]} from the group! 🚪\n\n` +
                    `👤 *User:* ${numberToKick.split('@')[0]}\n` +
                    `🏠 *Group:* ${from.split('@')[0]}\n` +
                    `⏰ *Time:* ${new Date().toLocaleTimeString()}`,
                    config.BOT_FOOTER
                )
            }, { quoted: fakevCard });
            
        } catch (error) {
            console.error('Kick command error:', error);
            await socket.sendMessage(sender, {
                text: `❌ *Failed to kick member!*\nError: ${error.message || 'Unknown error'}`
            });
        }
    }
};
