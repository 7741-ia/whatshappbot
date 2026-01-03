const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(
                chatId,
                { text: '🚫 *Commande réservée aux administrateurs du groupe*' },
                { quoted: message }
            );
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage =
`📛 *CONFIGURATION ANTILINK*

${prefix}antilink on
→ Activer l’antilink

${prefix}antilink set delete | kick | warn
→ Définir l’action

${prefix}antilink off
→ Désactiver l’antilink
`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on': {
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(
                        chatId,
                        { text: 'ℹ️ *Antilink est déjà activé dans ce groupe*' },
                        { quoted: message }
                    );
                    return;
                }

                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(
                    chatId,
                    {
                        text: result
                            ? '✅ *Antilink activé avec succès*'
                            : '❌ *Échec de l’activation de l’antilink*'
                    },
                    { quoted: message }
                );
                break;
            }

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(
                    chatId,
                    { text: '❎ *Antilink désactivé dans ce groupe*' },
                    { quoted: message }
                );
                break;

            case 'set': {
                if (args.length < 2) {
                    await sock.sendMessage(
                        chatId,
                        {
                            text: `⚠️ *Précise une action :*\n${prefix}antilink set delete | kick | warn`
                        },
                        { quoted: message }
                    );
                    return;
                }

                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(
                        chatId,
                        { text: '❌ *Action invalide. Choisis : delete, kick ou warn*' },
                        { quoted: message }
                    );
                    return;
                }

                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(
                    chatId,
                    {
                        text: setResult
                            ? `✅ *Action antilink définie sur : ${setAction}*`
                            : '❌ *Impossible de définir l’action antilink*'
                    },
                    { quoted: message }
                );
                break;
            }

            case 'get': {
                const config = await getAntilink(chatId, 'on');
                await sock.sendMessage(
                    chatId,
                    {
                        text:
`📊 *Configuration Antilink*

Statut : ${config?.enabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}
Action : ${config?.action || 'Non définie'}`
                    },
                    { quoted: message }
                );
                break;
            }

            default:
                await sock.sendMessage(
                    chatId,
                    { text: `ℹ️ *Utilise ${prefix}antilink pour voir l’aide*` },
                    { quoted: message }
                );
        }
    } catch (error) {
        console.error('Erreur commande antilink :', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Erreur lors du traitement de la commande antilink*'
        });
    }
}

// ================= DÉTECTION DES LIENS =================

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
        telegram: /t\.me\/[A-Za-z0-9_]+/i,
        allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i
    };

    if (antilinkSetting === 'whatsappGroup' && linkPatterns.whatsappGroup.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (!shouldDelete) return;

    try {
        await sock.sendMessage(chatId, {
            delete: {
                remoteJid: chatId,
                fromMe: false,
                id: message.key.id,
                participant: message.key.participant || senderId
            }
        });
    } catch (error) {
        console.error('Erreur suppression lien :', error);
        return;
    }

    await sock.sendMessage(chatId, {
        text: `⚠️ @${senderId.split('@')[0]} les liens sont interdits dans ce groupe`,
        mentions: [senderId]
    });
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
