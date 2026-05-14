const https = require('https');
const { FedaPay, Transaction } = require('fedapay');

// ─── Environnement ──────────────────────────────────────────────────────────
const isSandbox = (process.env.FEDAPAY_SECRET_KEY || '').startsWith('sk_sandbox_');

// En sandbox Windows, désactiver la vérification TLS
if (isSandbox) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Configurer le SDK — NE PAS appeler setApiBase (le SDK ajoute /v1 lui-même)
FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
FedaPay.setEnvironment(isSandbox ? 'sandbox' : 'live');

/**
 * Crée une transaction FedaPay et retourne le token de paiement + URL
 */
const createTransaction = async ({
  amount,
  description = 'Cotisation AgriLogix',
  customerName = 'Membre',
  customerSurname = 'AgriLogix',
  customerEmail = '',
  customerPhone = '',
  callbackUrl,
  metadata = {},
}) => {
  try {
    const customer = {
      firstname: customerName,
      lastname: customerSurname,
    };
    if (customerEmail) customer.email = customerEmail;
    if (customerPhone) customer.phone_number = { number: customerPhone, country: 'TG' };

    const transaction = await Transaction.create({
      description,
      amount: Number(amount),
      currency: { iso: 'XOF' },
      callback_url: callbackUrl || process.env.FEDAPAY_CALLBACK_URL,
      custom_metadata: metadata,
      customer,
    });

    // generateToken() retourne un objet dont .token est le token et .url l'URL
    const tokenObj = await transaction.generateToken();

    console.log('[FedaPay] Transaction créée:', transaction.id);
    return {
      transaction_id: transaction.id,
      token: tokenObj.token,
      payment_url: tokenObj.url,
      amount: Number(amount),
      status: transaction.status || 'pending',
    };
  } catch (error) {
    const msg = error.message || 'Erreur FedaPay';
    console.error('[FedaPay] createTransaction error:', msg);
    throw new Error(msg);
  }
};

/**
 * Vérifie le statut d'une transaction FedaPay
 */
const verifyTransaction = async (transactionId) => {
  try {
    const transaction = await Transaction.retrieve(transactionId);
    return {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      amount: transaction.amount,
      description: transaction.description,
      mode: transaction.mode,
      metadata: transaction.custom_metadata,
      receipt_url: transaction.receipt_url,
      approved: transaction.status === 'approved',
    };
  } catch (error) {
    console.error('[FedaPay] verifyTransaction error:', error.message);
    throw new Error(error.message || 'Erreur lors de la vérification');
  }
};

/**
 * Effectue un paiement direct via Mobile Money (sans redirection)
 * Signature correcte: transaction.sendNowWithToken(mode, token, phoneNumber)
 */
const directPay = async ({
  amount,
  description = 'Cotisation AgriLogix',
  customerName = 'Membre',
  customerSurname = 'AgriLogix',
  customerEmail = '',
  phoneNumber = '',
  mode = 'mtn_tg',
  metadata = {},
}) => {
  try {
    const country = mode.includes('_bj') ? 'bj' : 'tg';

    const customer = {
      firstname: customerName,
      lastname: customerSurname,
      email: customerEmail || `customer_${Date.now()}@agrilogix.com`,
      phone_number: { number: phoneNumber, country },
    };

    // 1. Créer la transaction
    const transaction = await Transaction.create({
      description,
      amount: Number(amount),
      currency: { iso: 'XOF' },
      callback_url: process.env.FEDAPAY_CALLBACK_URL,
      custom_metadata: metadata,
      customer,
    });

    // 2. Générer le token (obligatoire avant le paiement direct)
    const tokenObj = await transaction.generateToken();
    const token = tokenObj.token;

    console.log('[FedaPay Direct] TX:', transaction.id, '| Mode:', mode);

    // 3. Déclencher le paiement Mobile Money via le SDK
    const payRes = await transaction.sendNowWithToken(mode, token, {
      number: phoneNumber,
      country
    });

    console.log('[FedaPay Direct] Paiement initié:', transaction.id);
    return {
      transaction_id: transaction.id,
      status: 'pending',
      amount: Number(amount),
      response: payRes,
    };

  } catch (error) {
    const msg = error.message || 'Erreur paiement direct';
    console.error('[FedaPay] directPay error:', msg);
    throw new Error(msg);
  }
};

module.exports = { createTransaction, verifyTransaction, directPay };
