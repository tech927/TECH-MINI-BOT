const moment = require('moment-timezone');
const os = require('os');
const crypto = require('crypto');

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getSriLankaTimestamp() {
    return moment().tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss');
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function createSerial(size) {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jidNormalizedUser(jid) {
    return jid.split(':')[0] + '@s.whatsapp.net';
}

function loadAdmins() {
    const fs = require('fs');
    const config = require('../config');
    
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

module.exports = {
    formatMessage,
    formatBytes,
    getSriLankaTimestamp,
    generateOTP,
    capital,
    createSerial,
    delay,
    jidNormalizedUser,
    loadAdmins
};
