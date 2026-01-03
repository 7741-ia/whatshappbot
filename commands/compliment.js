const compliments = [
    "Tu es incroyable tel(le) que tu es !",
    "Tu as un excellent sens de l’humour !",
    "Tu es vraiment attentionné(e) et gentil(le).",
    "Tu es plus fort(e) que tu ne le penses.",
    "Tu illumines la pièce !",
    "Tu es un(e) véritable ami(e).",
    "Tu m’inspires énormément !",
    "Ta créativité n’a aucune limite !",
    "Tu as un cœur en or.",
    "Tu fais une vraie différence dans le monde.",
    "Ta positivité est contagieuse !",
    "Tu as une éthique de travail impressionnante.",
    "Tu fais ressortir le meilleur chez les autres.",
    "Ton sourire illumine la journée de tout le monde.",
    "Tu es talentueux(se) dans tout ce que tu fais.",
    "Ta gentillesse rend le monde meilleur.",
    "Tu as une perspective unique et merveilleuse.",
    "Ton enthousiasme est vraiment inspirant !",
    "Tu es capable d’accomplir de grandes choses.",
    "Tu sais toujours comment faire sentir quelqu’un de spécial.",
    "Ta confiance est admirable.",
    "Tu as une belle âme.",
    "Ta générosité n’a pas de limites.",
    "Tu as un excellent sens du détail.",
    "Ta passion est très motivante !",
    "Tu es une personne à l’écoute.",
    "Tu es plus fort(e) que tu ne le crois !",
    "Ton rire est communicatif.",
    "Tu as un don naturel pour faire sentir les autres importants.",
    "Le monde est meilleur grâce à toi.",

    // ➕ NOUVEAUX COMPLIMENTS
    "Tu apportes toujours une bonne énergie autour de toi.",
    "Ta présence rend les choses plus simples.",
    "Tu es quelqu’un sur qui on peut vraiment compter.",
    "Tu as une manière spéciale de motiver les autres.",
    "Tu es une source de paix et de confiance.",
    "Tu fais les choses avec le cœur.",
    "Tu sais transformer une mauvaise journée en bonne.",
    "Tu es une personne précieuse.",
    "Ton respect pour les autres force l’admiration.",
    "Tu avances avec courage, même quand ce n’est pas facile.",
    "Tu as une sagesse qui inspire.",
    "Tu es un bel exemple pour les autres.",
    "Tu mérites tout le bien qui t’arrive.",
    "Tu es unique, et c’est ce qui te rend spécial(e).",
    "Tu as une force intérieure remarquable.",
    "Ton attitude positive change tout.",
    "Tu sais toujours trouver les bons mots.",
    "Tu fais preuve d’une grande maturité.",
    "Tu es une bénédiction pour ton entourage.",
    "Tu donnes envie de devenir une meilleure personne.",
    "Tu as une âme lumineuse.",
    "Ton authenticité est très appréciable.",
    "Tu as un grand sens des responsabilités.",
    "Tu es un pilier pour ceux qui t’entourent.",
    "Tu fais les choses avec sincérité.",
    "Tu as une belle façon de voir la vie.",
    "Ta détermination est impressionnante.",
    "Tu inspires le respect et l’admiration.",
    "Tu sais écouter sans juger.",
    "Tu es une personne vraiment admirable.",
    "Même Google ne te trouve pas de défaut 😄",
    "Si être génial était un métier, tu serais riche 😂",
    "Tu rends la jalousie inutile.",
    "Tu es la définition du mot « classe ».",
    "Franchement… respect 🫡",
    "Tu gères ça comme un(e) pro.",
    "Même les lundis te respectent 😎",
    "Ton charisme mérite un abonnement.",
    "Tu es trop fort(e), faut partager un peu 😅",
    "Tu rends les mauvaises journées jalouses."
];


async function complimentCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Message ou chatId invalide :', { message, chatId });
            return;
        }

        let utilisateurAComplimenter;
        
        // Vérifier s’il y a un utilisateur mentionné
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            utilisateurAComplimenter =
                message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Vérifier si le message est une réponse à quelqu’un
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            utilisateurAComplimenter =
                message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!utilisateurAComplimenter) {
            await sock.sendMessage(chatId, { 
                text: 'Veuillez mentionner quelqu’un ou répondre à son message pour lui faire un compliment !'
            });
            return;
        }

        const compliment =
            compliments[Math.floor(Math.random() * compliments.length)];

        // Ajouter un délai pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Hey @${utilisateurAComplimenter.split('@')[0]}, ${compliment}`,
            mentions: [utilisateurAComplimenter]
        });
    } catch (error) {
        console.error('Erreur dans la commande compliment :', error);

        if (error.data === 429) {
            // Trop de requêtes
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Veuillez réessayer dans quelques secondes.'
                });
            } catch (retryError) {
                console.error('Erreur lors de l’envoi du message de nouvelle tentative :', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Une erreur est survenue lors de l’envoi du compliment.'
                });
            } catch (sendError) {
                console.error('Erreur lors de l’envoi du message d’erreur :', sendError);
            }
        }
    }
}

module.exports = { complimentCommand };
