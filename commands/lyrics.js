const fetch = require('node-fetch');

async function lyricsCommand(sock, chatId, songTitle, message) {
    // Vérifie si l'utilisateur a fourni le nom de la chanson
    if (!songTitle) {
        return sock.sendMessage(
            chatId,
            { text: '🔍 Veuillez entrer le nom de la chanson.\nUtilisation : *lyrics <nom de la chanson>*' },
            { quoted: message }
        );
    }

    try {
        // Appel à l'API de paroles
        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const response = await fetch(apiUrl);

        // Gestion des erreurs de l'API
        if (!response.ok) {
            throw new Error(`Erreur API : ${response.status}`);
        }

        const data = await response.json();
        const lyrics = data?.result?.lyrics;

        // Si aucune parole n'est trouvée
        if (!lyrics) {
            return sock.sendMessage(
                chatId,
                { text: `❌ Aucune parole trouvée pour *${songTitle}*.` },
                { quoted: message }
            );
        }

        // Extrait court des paroles (respect du droit d'auteur)
        const previewLength = 400;
        const preview = lyrics.length > previewLength
            ? lyrics.slice(0, previewLength) + '\n\n...'
            : lyrics;

        const output =
            `🎵 *Aperçu des paroles*\n` +
            `🎶 *Chanson :* ${songTitle}\n\n` +
            `${preview}\n\n` +
            `_Les paroles complètes ne sont pas affichées pour des raisons de droits d’auteur._`;

        await sock.sendMessage(
            chatId,
            { text: output },
            { quoted: message }
        );

    } catch (error) {
        console.error('Erreur dans la commande lyrics :', error);

        await sock.sendMessage(
            { text: '❌ Une erreur est survenue lors de la récupération des paroles. Veuillez réessayer plus tard.' },
            { quoted: message }
        );
    }
}

module.exports = { lyricsCommand };
