const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Stockage en mémoire pour l’historique et les infos utilisateur
const chatMemory = {
    messages: new Map(), // Stocke les 20 derniers messages par utilisateur
    userInfo: new Map()  // Stocke les informations utilisateur
};

// Charger les données des groupes
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données du groupe :', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Sauvegarder les données des groupes
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des données du groupe :', error.message);
    }
}

// Délai aléatoire entre 2 et 5 secondes
function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

// Afficher l’indicateur "en train d’écrire"
async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    } catch (error) {
        console.error('Erreur indicateur de saisie :', error);
    }
}

// Extraire les informations utilisateur depuis le message
function extractUserInfo(message) {
    const info = {};

    if (message.toLowerCase().includes('my name is')) {
        info.name = message.split('my name is')[1].trim().split(' ')[0];
    }

    if (message.toLowerCase().includes('i am') && message.toLowerCase().includes('years old')) {
        info.age = message.match(/\d+/)?.[0];
    }

    if (
        message.toLowerCase().includes('i live in') ||
        message.toLowerCase().includes('i am from')
    ) {
        info.location = message
            .split(/(?:i live in|i am from)/i)[1]
            .trim()
            .split(/[.,!?]/)[0];
    }

    return info;
}

// Commande .chatbot on / off
async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `*CONFIGURATION CHATBOT*\n\n*.chatbot on*\nActiver le chatbot\n\n*.chatbot off*\nDésactiver le chatbot dans ce groupe`,
            quoted: message
        });
    }

    const data = loadUserGroupData();

    // Numéro du bot
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    // ID de l’expéditeur
    const senderId =
        message.key.participant ||
        message.participant ||
        message.pushName ||
        message.key.remoteJid;

    const isOwner = senderId === botNumber;

    // Accès direct pour le propriétaire du bot
    if (isOwner) {
        if (match === 'on') {
            await showTyping(sock, chatId);
            if (data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: '*Le chatbot est déjà activé dans ce groupe*',
                    quoted: message
                });
            }
            data.chatbot[chatId] = true;
            saveUserGroupData(data);
            return sock.sendMessage(chatId, {
                text: '*Le chatbot a été activé dans ce groupe*',
                quoted: message
            });
        }

        if (match === 'off') {
            await showTyping(sock, chatId);
            if (!data.chatbot[chatId]) {
                return sock.sendMessage(chatId, {
                    text: '*Le chatbot est déjà désactivé dans ce groupe*',
                    quoted: message
                });
            }
            delete data.chatbot[chatId];
            saveUserGroupData(data);
            return sock.sendMessage(chatId, {
                text: '*Le chatbot a été désactivé dans ce groupe*',
                quoted: message
            });
        }
    }

    // Vérifier si l’utilisateur est admin
    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            isAdmin = groupMetadata.participants.some(
                p =>
                    p.id === senderId &&
                    (p.admin === 'admin' || p.admin === 'superadmin')
            );
        } catch {
            console.warn('⚠️ Impossible de récupérer les infos du groupe.');
        }
    }

    if (!isAdmin && !isOwner) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: '❌ Seuls les administrateurs du groupe ou le propriétaire du bot peuvent utiliser cette commande.',
            quoted: message
        });
    }

    if (match === 'on') {
        await showTyping(sock, chatId);
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, {
                text: '*Le chatbot est déjà activé dans ce groupe*',
                quoted: message
            });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        return sock.sendMessage(chatId, {
            text: '*Le chatbot a été activé dans ce groupe*',
            quoted: message
        });
    }

    if (match === 'off') {
        await showTyping(sock, chatId);
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, {
                text: '*Le chatbot est déjà désactivé dans ce groupe*',
                quoted: message
            });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        return sock.sendMessage(chatId, {
            text: '*Le chatbot a été désactivé dans ce groupe*',
            quoted: message
        });
    }

    await showTyping(sock, chatId);
    return sock.sendMessage(chatId, {
        text: '*Commande invalide. Utilisez .chatbot pour voir l’aide*',
        quoted: message
    });
}

// Réponse automatique du chatbot
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        // (Logique inchangée)
        // …

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (error) {
        console.error('❌ Erreur chatbot :', error.message);

        if (error.message?.includes('No sessions')) return;

        await sock.sendMessage(chatId, {
            text: "Oups 😅 j’ai buggué un peu… Tu peux répéter ?",
            quoted: message
        });
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
