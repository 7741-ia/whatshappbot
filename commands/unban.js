const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

const BANNED_FILE = './data/banned.json';
const TEMP_BANNED_FILE = './data/tempBanned.json';

async function unbanCommand(sock, chatId, message) {
    // 🔒 En groupe : admins uniquement | En privé : owner / sudo
    const isGroup = chatId.endsWith('@g.us');

    if (isGroup) {
        const senderId = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            return sock.sendMessage(
                chatId,
                { text: '⚠️ Le bot doit être administrateur pour utiliser .unban', ...channelInfo },
                { quoted: message }
            );
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            return sock.sendMessage(
                chatId,
                { text: '❌ Seuls les administrateurs du groupe peuvent utiliser .unban', ...channelInfo },
                { quoted: message }
            );
        }
    } else {
        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);

        if (!message.key.fromMe && !senderIsSudo) {
            return sock.sendMessage(
                chatId,
                { text: '❌ Seul le propriétaire ou un sudo peut utiliser .unban en privé', ...channelInfo },
                { quoted: message }
            );
        }
    }

    // 👤 Utilisateur à débannir
    let userToUnban =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        message.message?.extendedTextMessage?.contextInfo?.participant;

    if (!userToUnban) {
        return sock.sendMessage(
            chatId,
            {
                text: 'Veuillez mentionner un utilisateur ou répondre à son message pour le débannir.',
                ...channelInfo
            },
            { quoted: message }
        );
    }

    try {
        // 📂 Lecture des fichiers
        const bannedUsers = fs.existsSync(BANNED_FILE)
            ? JSON.parse(fs.readFileSync(BANNED_FILE))
            : [];

        const tempBannedUsers = fs.existsSync(TEMP_BANNED_FILE)
            ? JSON.parse(fs.readFileSync(TEMP_BANNED_FILE))
            : {};

        const wasPermanent = bannedUsers.includes(userToUnban);
        const wasTemporary = Boolean(tempBannedUsers[userToUnban]);

        // 🧹 Suppression
        const updatedBanned = bannedUsers.filter(u => u !== userToUnban);
        delete tempBannedUsers[userToUnban];

        fs.writeFileSync(BANNED_FILE, JSON.stringify(updatedBanned, null, 2));
        fs.writeFileSync(TEMP_BANNED_FILE, JSON.stringify(tempBannedUsers, null, 2));

        // 📢 Réponse
        if (wasPermanent || wasTemporary) {
            await sock.sendMessage(chatId, {
                text: `✅ @${userToUnban.split('@')[0]} a été débanni avec succès.`,
                mentions: [userToUnban],
                ...channelInfo
            });
        } else {
            await sock.sendMessage(chatId, {
                text: `ℹ️ @${userToUnban.split('@')[0]} n’était pas banni.`,
                mentions: [userToUnban],
                ...channelInfo
            });
        }
    } catch (error) {
        console.error('❌ Erreur dans la commande unban :', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ Échec du débannissement de l’utilisateur.', ...channelInfo },
            { quoted: message }
        );
    }
}

module.exports = unbanCommand;
