const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// Charger la configuration antibadword
function loadAntibadwordConfig(groupId) {
    try {
        const configPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(configPath)) return {};
        const data = JSON.parse(fs.readFileSync(configPath));
        return data.antibadword?.[groupId] || {};
    } catch (error) {
        console.error('❌ Erreur chargement antibadword :', error.message);
        return {};
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text:
`*CONFIGURATION ANTIBADWORD*

.antibadword on
→ Activer l’anti-insultes

.antibadword set <action>
→ Action : delete / kick / warn

.antibadword off
→ Désactiver l’anti-insultes`
        }, { quoted: message });
    }

    if (match === 'on') {
        const config = await getAntiBadword(chatId, 'on');
        if (config?.enabled) {
            return sock.sendMessage(chatId, { text: '*Antibadword est déjà activé dans ce groupe*' }, { quoted: message });
        }
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, { text: '*Antibadword activé avec succès*' }, { quoted: message });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '*Antibadword est déjà désactivé*' }, { quoted: message });
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '*Antibadword désactivé dans ce groupe*' }, { quoted: message });
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];
        if (!['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, {
                text: '*Action invalide : delete / kick / warn*'
            }, { quoted: message });
        }
        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, {
            text: `*Action antibadword définie sur : ${action}*`
        }, { quoted: message });
    }
}

// ================== DÉTECTION DES INSULTES ==================

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    if (!chatId.endsWith('@g.us')) return;
    if (message.key.fromMe) return;

    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) return;

    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 🔥 MOTS INTERDITS (Afrique centrale + Afrique en général)
    const badWords = [
        // 🇨🇩 RDC / Congo / Afrique centrale
        'zoba', 'imbécile', 'idiot', 'stupide', 'con', 'conne',
        'mbwa', 'chien', 'pombe', 'ivrogne', 'ndoki', 'sorcier',
        'liboma', 'mayele te', 'koko', 'fou', 'folle',
        'tala mutu', 'muana mbwa', 'mayele pamba',

        // 🇨🇲 Cameroun / Afrique francophone
        'mboutoukou', 'bamenda', 'fou là', 'crétin',
        'sale type', 'voleur', 'escroc', 'arnaqueur',

        // 🌍 Général Afrique (FR / EN)
        'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'idiot',
        'fucker', 'motherfucker', 'nonsense', 'stupid',
        'merde', 'putain', 'salope', 'connard',

        // 🔞 Vulgaire / insultes sexuelles
        'pute', 'prostituée', 'bordel', 'cul', 'bite', 'chatte',
        'baise', 'niquer', 'enculé',

        // 🚫 Racisme / haine
        'nigger', 'nigga', 'sale noir', 'sale blanc',

        // 💊 Drogue
        'weed', 'coke', 'heroin', 'drogue', 'joint'
    ];

    const words = cleanMessage.split(' ');
    let detected = false;

    for (const word of words) {
        if (word.length < 2) continue;
        if (badWords.includes(word)) {
            detected = true;
            break;
        }
    }

    if (!detected) return;

    // Vérifier admin bot
    const metadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = metadata.participants.find(p => p.id === botId);
    if (!bot?.admin) return;

    // Ne pas sanctionner admin
    const sender = metadata.participants.find(p => p.id === senderId);
    if (sender?.admin) return;

    // Supprimer le message
    await sock.sendMessage(chatId, { delete: message.key });

    switch (antiBadwordConfig.action) {
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `⚠️ @${senderId.split('@')[0]} les insultes sont interdites ici`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} expulsé pour langage inapproprié`,
                mentions: [senderId]
            });
            break;

        case 'warn':
            const warns = await incrementWarningCount(chatId, senderId);
            if (warns >= 3) {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await resetWarningCount(chatId, senderId);
                await sock.sendMessage(chatId, {
                    text: `🚫 @${senderId.split('@')[0]} expulsé après 3 avertissements`,
                    mentions: [senderId]
                });
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠️ @${senderId.split('@')[0]} avertissement ${warns}/3`,
                    mentions: [senderId]
                });
            }
            break;
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};
