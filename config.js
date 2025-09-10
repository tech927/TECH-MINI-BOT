require('dotenv').config();

module.exports = {
    // Bot Identity
    BOT_NAME: process.env.BOT_NAME || 'sʜᴀᴅᴏᴡ ᴍɪɴɪ ʙᴏᴛ',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '221786026985',
    VERSION: process.env.VERSION || '1.0.0',
    
    // Bot Settings
    PREFIX: process.env.PREFIX || '.',
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
    
    // Auto Features
    AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS || 'true',
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || 'true',
    AUTO_RECORDING: process.env.AUTO_RECORDING || 'true',
    AUTO_LIKE_EMOJI: process.env.AUTO_LIKE_EMOJI?.split(',') || ['💋', '😶', '✨️', '💗', '🎈', '🎉', '🥳', '❤️', '🧫', '🐭'],
    
    // Media Paths
    IMAGE_PATH: process.env.IMAGE_PATH || 'https://files.catbox.moe/76gwuj.jpg',
    RCD_IMAGE_PATH: process.env.RCD_IMAGE_PATH || 'https://files.catbox.moe/9z2ixp.jpg',
    
    // Group Settings
    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || '',
    
    // Newsletter
    NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363401051937059@newsletter',
    NEWSLETTER_MESSAGE_ID: process.env.NEWSLETTER_MESSAGE_ID || '428',
    
    // Security
    OTP_EXPIRY: parseInt(process.env.OTP_EXPIRY) || 300000,
    
    // Messages
    BOT_FOOTER: process.env.BOT_FOOTER || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅʏʙʏ ᴛᴇᴄʜ',
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbAdcIXJP216dKW1253g',
    CAPTION: process.env.CAPTION || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅʏʙʏ ᴛᴇᴄʜ',
    
    // GitHub Configuration
    GITHUB: {
        OWNER: process.env.GITHUB_OWNER || 'townen2',
        REPO: process.env.GITHUB_REPO || 'SHADOW-SESSION',
        TOKEN: process.env.GITHUB_TOKEN || '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'
    },
    
    // Paths
    SESSION_BASE_PATH: process.env.SESSION_BASE_PATH || './session',
    NUMBER_LIST_PATH: process.env.NUMBER_LIST_PATH || './numbers.json',
    ADMIN_LIST_PATH: process.env.ADMIN_LIST_PATH || './admin.json'
};
