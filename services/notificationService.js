const Notification = require('../models/Notification');
const axios = require('axios');
const User = require('../models/User');
const Cooperative = require('../models/Cooperative');

/**
 * Crée une notification en base, l'émet via Socket.io et envoie des notifications push native (Expo)
 * @param {Object} io - Instance Socket.io
 * @param {Object} params - { coopId, title, message, type, senderName, data }
 */
async function createAndEmitNotification(io, { coopId, title, message, type, senderName, actorId, data }) {
  try {
    const notif = await Notification.create({
      cooperativeId: coopId,
      title,
      message,
      type,
      senderName,
      actorId,
      data
    });

    // 1. Temps réel via Socket.io
    if (io) {
      const room = `coop_${coopId}`;
      io.to(room).emit('new_notification', notif);
      console.log(`[Notif] Sent to ${room}: ${title}`);
    }

    // 2. Notifications Push Natives (Expo) - Exécuté en arrière-plan
    (async () => {
      try {
        const coop = await Cooperative.findById(coopId).populate('members');
        if (!coop) return;

        const messages = [];
        for (const member of coop.members) {
          if (member.pushToken && member.pushToken.startsWith('ExponentPushToken')) {
            messages.push({
              to: member.pushToken,
              sound: 'default',
              title: title,
              body: message,
              data: { ...data, notifId: notif._id, type }
            });
          }
        }

        if (messages.length > 0) {
          await axios.post('https://exp.host/--/api/v2/push/send', messages);
          console.log(`[Push] Envoyé à ${messages.length} membres.`);
        }
      } catch (pushErr) {
        console.error('[Push] Error sending to Expo:', pushErr.message);
      }
    })();
    
    return notif;
  } catch (err) {
    console.error('[NotificationService] Error:', err.message);
  }
}

module.exports = { createAndEmitNotification };
