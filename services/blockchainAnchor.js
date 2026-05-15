/**
 * Ancrage ledger Mongo → contrat CoopLedger (voir routes blockchain existantes).
 */
const blockchain = require('../blockchain');

function isProbablyOnChainHash(hex) {
  return typeof hex === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hex);
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
 * @param {*} txDoc document Transaction Mongoose sauvegardé (statut completed)
 * @returns {Promise<string|null>} txHash ou null si hors chaîne / erreur
 */
async function anchorCompletedTransaction(txDoc) {
  if (!blockchain.canWrite()) return null;

  if (!txDoc || txDoc.status !== 'completed') return null;
  if (isProbablyOnChainHash(txDoc.txHash)) return txDoc.txHash;

  const typeOp = mongoToTypeOp(txDoc.type, txDoc.category, txDoc.title);
  const montant = Math.max(0, Math.floor(Number(txDoc.amount) || 0));
  const desc = String(txDoc.title || 'Opération').slice(0, 240);

  try {
    const hash = await blockchain.recordLedgerTransaction(typeOp, montant, desc);
    if (hash && txDoc.save) {
      txDoc.txHash = hash;
      await txDoc.save();
    }
    return hash;
  } catch (e) {
    console.error('[blockchainAnchor]', e?.shortMessage || e?.message || e);
    return null;
  }
}

module.exports = {
  anchorCompletedTransaction,
  isProbablyOnChainHash,
  mongoToTypeOp,
};
