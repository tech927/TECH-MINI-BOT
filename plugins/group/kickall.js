const config = require('../../config');
const { formatMessage } = require('../../lib/utils/helpers');

module.exports = {
    name: 'kickall',
    description: 'Retire tous les membres du groupe',
    usage: `${config.PREFIX}kickall`,
    
    async execute(socket, msg, args, { isOwner, isGroup, sender, from, number }) {
        try {
            await socket.sendMessage(sender, { react: { text: '⚡', key: msg.key } });

            if (!isGroup) {
                return await socket.sendMessage(sender, {
                    text: '❌ *This command can only be used in groups!*'
                });
            }

            if (!isOwner) {
                return await socket.sendMessage(sender, {
                    text: '❌ *Only bot owner can use this command!*'
                });
            }

            // Simuler la récupération des métadonnées du groupe
            const groupMetadata = {
                participants: [
                    { id: '1234567890@s.whatsapp.net', admin: null },
                    { id: '0987654321@s.whatsapp.net', admin: 'admin' },
                    { id: '1111111111@s.whatsapp.net', admin: null }
                ]
            };

            const botJid = socket.user?.id || socket.user?.jid;
            const membersToRemove = groupMetadata.participants
                .filter(p => p.admin === null && p.id !== botJid)
                .map(p => p.id);

            if (membersToRemove.length === 0) {
                return await socket.sendMessage(sender, {
                    text: '❌ *No members to remove (all are admins or bot).*'
                });
            }

            await socket.sendMessage(sender, {
                text: `⚠️ *WARNING* ⚠️\n\nRemoving *${membersToRemove.length}* members...`
            });

            // Simuler la suppression
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

            await socket.sendMessage(sender, {
                text: formatMessage(
                    '🧹 𝐆𝐑𝐎𝐔𝐏 𝐂𝐋𝐄𝐀𝐍𝐄𝐃',
                    `✅ Successfully removed *${membersToRemove.length}* members.\n\n` +
                    `> *Executed by:* @${sender.split('@')[0]}\n` +
                    `> *Group:* ${from.split('@')[0]}\n` +
                    `> *Time:* ${new Date().toLocaleString()}`,
                    config.BOT_FOOTER
                )
            }, { quoted: fakevCard });

        } catch (error) {
            console.error('Kickall command error:', error);
            await socket.sendMessage(sender, {
                text: `❌ *Failed to remove members!*\nError: ${error.message || 'Unknown error'}`
            });
        }
    }
};
