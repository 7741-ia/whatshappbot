const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    // Extraire le message cité
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;
    const quotedAudio = quoted?.audioMessage;

    // IMAGE vue unique
    if (quotedImage && quotedImage.viewOnce) {
        const stream = await downloadContentFromMessage(quotedImage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await sock.sendMessage(
            chatId,
            {
                image: buffer,
                fileName: 'media.jpg',
                caption: quotedImage.caption || ''
            },
            { quoted: message }
        );

    // VIDEO vue unique
    } else if (quotedVideo && quotedVideo.viewOnce) {
        const stream = await downloadContentFromMessage(quotedVideo, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await sock.sendMessage(
            chatId,
            {
                video: buffer,
                fileName: 'media.mp4',
                caption: quotedVideo.caption || ''
            },
            { quoted: message }
        );

    // AUDIO vue unique (voice note)
    } else if (quotedAudio && quotedAudio.viewOnce) {
        const stream = await downloadContentFromMessage(quotedAudio, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await sock.sendMessage(
            chatId,
            {
                audio: buffer,
                mimetype: quotedAudio.mimetype || 'audio/ogg; codecs=opus',
                ptt: quotedAudio.ptt || false
            },
            { quoted: message }
        );

    // Aucune vue unique trouvée
    } else {
        await sock.sendMessage(
            chatId,
            { text: '❌ Réponds à une image, vidéo ou audio en vue unique.' },
            { quoted: message }
        );
    }
}

module.exports = viewonceCommand;
