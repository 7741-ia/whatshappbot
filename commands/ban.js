const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

const BANNED_FILE = './data/banned.json';
const TEMP_BANNED_FILE = './data/tempBanned.json';

function parseDuration(time) {
    const match = time?.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000
    };

    return Date.now() + value * multipliers[unit];
}

async function banCommand(sock, chatId, message, args = []) {
    const isGroup = chatId.endsWith('@g.us');

    // 🔒 Permissions
    if (isGroup) {
        const senderId = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            return sock.sendMessage(chatId, {
                text: '⚠️ Le bot doit être administrateur pour bannir.',
                ...channelInfo
            }, { quoted: message });
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            return sock.sendMessage(chatId, {
                text: '❌ Seuls les admins peuvent utiliser .ban',
                ...channelInfo
            }, { quoted: message });
        }
    } else {
        const senderId = message.key.participant || message.key.remoteJid;
        if (!message.key.fromMe && !(await isSudo(senderId))) {
            return sock.sendMessage(chatId, {
                text: '❌ Seul le propriétaire/sudo peut bannir en privé.',
                ...channelInfo
            }, { quoted: message });
        }
    }

    let userToBan =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        message.message?.extendedTextMessage?.contextInfo?.participant;

    if (!userToBan) {
        return sock.sendMessage(chatId, {
            text: 'Mentionne ou réponds à un utilisateur pour le bannir.',
            ...channelInfo
        });
    }

    const duration = parseDuration(args[0]);

    if (duration) {
        const tempBanned = JSON.parse(fs.readFileSync(TEMP_BANNED_FILE));
        tempBanned[userToBan] = duration;
        fs.writeFileSync(TEMP_BANNED_FILE, JSON.stringify(tempBanned, null, 2));

        return sock.sendMessage(chatId, {
            text: `⏱️ @${userToBan.split('@')[0]} est banni temporairement.`,
            mentions: [userToBan],
            ...channelInfo
        });
    }

    const banned = JSON.parse(fs.readFileSync(BANNED_FILE));
    if (!banned.includes(userToBan)) {
        banned.push(userToBan);
        fs.writeFileSync(BANNED_FILE, JSON.stringify(banned, null, 2));

        return sock.sendMessage(chatId, {
            text: `🚫 @${userToBan.split('@')[0]} a été banni définitivement.`,
            mentions: [userToBan],
            ...channelInfo
        });
    }

    return sock.sendMessage(chatId, {
        text: '⚠️ Cet utilisateur est déjà banni.',
        ...channelInfo
    });
}

module.exports = banCommand;
