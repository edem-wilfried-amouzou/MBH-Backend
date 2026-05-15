/**
 * Ancrage ledger Mongo → contrat CoopLedger.
 * Non-bloquant : si le réseau blockchain est lent ou indisponible,
 * la fonction retourne null sans bloquer la réponse HTTP.
 * La transaction MongoDB est toujours créée normalement.
 */
const blockchain = require('../blockchain');

const BLOCKCHAIN_TIMEOUT_MS = 15000; // 15 secondes max

function isProbablyOnChainHash(hex) {
  return typeof hex === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hex);
}

/**
 * Wrapper timeout : rejette la promesse si elle dépasse ms millisecondes.
 */
function withTimeout(promise, ms, label = 'opération') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[blockchainAnchor] Timeout ${label} (${ms}ms)`)), ms)
    ),
  ]);
}

/** Mapping CoopLedger: 0=COTISATION, 1=ACHAT, 2=PRIME, 3=REMBOURSEMENT */
function mongoToTypeOp(type, category = '', title = '') {
  const c = String(category || '').toLowerCase();
  const t = String(title || '').toLowerCase();
  const typeLower = String(type || '').toLowerCase();

  // Entrées
  if (typeLower === 'in' || typeLower === 'cotisation' || typeLower === 'deposit' || typeLower === 'credit' || c === 'cotisation') {
    if (/prime|subvention|don\b/.test(c) || /\bprime\b|subvention/.test(t)) return 2;
    return 0;
  }
  // Sorties
  if (typeLower === 'out') {
    if (/remboursement/.test(c) || /remboursement/.test(t)) return 3;
    return 1;
  }
  return 0;
}

/**
 * Ancre une transaction complétée sur la blockchain CoopLedger.
 * Retourne le txHash si succès, null sinon (jamais bloquant).
 * @param {*} txDoc document Transaction Mongoose sauvegardé (statut completed)
 * @returns {Promise<string|null>}
 */
async function anchorCompletedTransaction(txDoc) {
  if (!blockchain.canWrite()) return null;
  if (!txDoc || txDoc.status !== 'completed') return null;
  if (isProbablyOnChainHash(txDoc.txHash)) return txDoc.txHash;

  const typeOp = mongoToTypeOp(txDoc.type, txDoc.category, txDoc.title);
  const montant = Math.max(0, Math.floor(Number(txDoc.amount) || 0));
  const desc = String(txDoc.title || 'Opération').slice(0, 240);

  try {
    const hash = await withTimeout(
      blockchain.recordLedgerTransaction(typeOp, montant, desc),
      BLOCKCHAIN_TIMEOUT_MS,
      'enregistrement blockchain'
    );
    if (hash && txDoc.save) {
      txDoc.txHash = hash;
      // Sauvegarde du hash, sans bloquer si elle échoue
      await txDoc.save().catch((e) =>
        console.error('[blockchainAnchor] Échec sauvegarde hash:', e.message)
      );
    }
    return hash || null;
  } catch (e) {
    // Timeout ou erreur réseau → non-bloquant, on log et on continue
    console.warn('[blockchainAnchor] Non-bloquant:', e?.shortMessage || e?.message || e);
    return null;
  }
}

module.exports = {
  anchorCompletedTransaction,
  isProbablyOnChainHash,
  mongoToTypeOp,
};
