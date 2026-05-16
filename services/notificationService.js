const Notification = require('../models/Notification');

/**
 * Crée une notification en base et l'émet via Socket.io
 * @param {Object} io - Instance Socket.io
 * @param {Object} params - { coopId, title, message, type, senderName, data }
 */
async function createAndEmitNotification(io, { coopId, title, message, type, senderName, data }) {
  try {
    const notif = await Notification.create({
      cooperativeId: coopId,
      title,
      message,
      type,
      senderName,
      data
    });

    if (io) {
      const room = `coop_${coopId}`;
      io.to(room).emit('new_notification', notif);
      console.log(`[Notif] Sent to ${room}: ${title}`);
    }
    
    return notif;
  } catch (err) {
    console.error('[NotificationService] Error:', err.message);
  }
}

module.exports = { createAndEmitNotification };
