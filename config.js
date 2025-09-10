require('dotenv').config();

module.exports = {
    // Bot Identity
    BOT_NAME: process.env.BOT_NAME || 'ᴍɪɴɪ ɪɴᴄᴏɴɴᴜ xᴅ',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '554488138425',
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
    IMAGE_PATH: process.env.IMAGE_PATH || 'https://files.catbox.moe/bm2v7m.jpg',
    RCD_IMAGE_PATH: process.env.RCD_IMAGE_PATH || 'https://files.catbox.moe/bm2v7m.jpg',
    
    // Group Settings
    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || 'https://chat.whatsapp.com/JlI0FDZ5RpAEbeKvzAPpFt?mode=ems_copy_t',
    
    // Newsletter
    NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363397722863547@newsletter',
    NEWSLETTER_MESSAGE_ID: process.env.NEWSLETTER_MESSAGE_ID || '428',
    
    // Security
    OTP_EXPIRY: parseInt(process.env.OTP_EXPIRY) || 300000,
    
    // Messages
    BOT_FOOTER: process.env.BOT_FOOTER || '> ᴍᴀᴅᴇ ɪɴ ʙʏ ɪɴᴄᴏɴɴᴜ',
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb6T8td5K3zQZbsKEU1R',
    CAPTION: process.env.CAPTION || '> ᴍᴀᴅᴇ ɪɴ ʙʏ ɪɴᴄᴏɴɴᴜ',
    
    // GitHub Configuration
    GITHUB: {
        OWNER: process.env.GITHUB_OWNER || 'tech927',
        REPO: process.env.GITHUB_REPO || 'TECH-MINI-BOT',
        TOKEN: process.env.GITHUB_TOKEN || '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'
    },
    
    // Paths
    SESSION_BASE_PATH: process.env.SESSION_BASE_PATH || './session',
    NUMBER_LIST_PATH: process.env.NUMBER_LIST_PATH || './numbers.json',
    ADMIN_LIST_PATH: process.env.ADMIN_LIST_PATH || './admin.json'
};
