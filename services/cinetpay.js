const { CinetPayClient } = require('cinetpay-js');

let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.CINETPAY_API_KEY_TG;
  const apiPassword = process.env.CINETPAY_API_PASSWORD_TG;
  if (!apiKey || !apiPassword) {
    throw new Error('CinetPay: variables CINETPAY_API_KEY_TG / CINETPAY_API_PASSWORD_TG manquantes');
  }
  _client = new CinetPayClient({
    credentials: {
      TG: { apiKey, apiPassword }
    },
    baseUrl: 'https://api.cinetpay.co',
    debug: false
  });
  return _client;
}





/**
 * Initialise un paiement CinetPay
 */
const initPayment = async ({ amount, description, customer_name, customer_surname, orderId }) => {
  try {
    const payment = await client.payment.initialize({
      currency: 'XOF',
      merchantTransactionId: orderId || `ORDER_${Date.now()}`,
      amount: Number(amount),
      lang: 'fr',
      designation: description || 'Cotisation AgriLogix',
      clientEmail: 'contact@agrilogix.tg', // Requis par le SDK
      clientFirstName: customer_name || 'Membre',
      clientLastName: customer_surname || 'AgriLogix',

      successUrl: process.env.CINETPAY_RETURN_URL,
      failedUrl: process.env.CINETPAY_RETURN_URL,
      notifyUrl: process.env.CINETPAY_NOTIFY_URL,
      channel: 'PUSH'
    }, 'TG');

    return {
      transaction_id: payment.merchantTransactionId,
      payment_url: payment.paymentUrl,
      payment_token: payment.paymentToken
    };
  } catch (error) {
    console.error('CinetPay SDK Init Error:', error.message);
    throw error;
  }
};

/**
 * Vérifie le statut d'un paiement
 */
const checkPaymentStatus = async (transaction_id) => {
  try {
    const status = await client.payment.getStatus(transaction_id, 'TG');
    return status;
  } catch (error) {
    console.error('CinetPay SDK Check Status Error:', error.message);
    throw error;
  }
};



module.exports = {
  initPayment,
  checkPaymentStatus
};
