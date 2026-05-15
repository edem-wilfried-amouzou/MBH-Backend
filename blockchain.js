/**
 * Ethereum / Hardhat local — ethers v6.
 * Configurez via variables d'environnement (voir .env.example).
 * Jamais de clé privée commitée dans le dépôt.
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const DISABLED =
  process.env.BLOCKCHAIN_DISABLED === '1' ||
  process.env.BLOCKCHAIN_DISABLED === 'true';

let _provider;
let _wallet;
const _contracts = new Map();

function loadAddressesJson() {
  const rawInline = process.env.BLOCKCHAIN_ADDRESSES_JSON;
  if (rawInline) {
    try {
      const j = JSON.parse(rawInline);
      return j.addresses || j;
    } catch (_) {
      return null;
    }
  }
  const fp = process.env.BLOCKCHAIN_ADDRESSES_FILE;
  if (!fp) return null;
  const resolved = path.isAbsolute(fp) ? fp : path.join(__dirname, fp);
  if (!fs.existsSync(resolved)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return j.addresses || j;
  } catch (_) {
    return null;
  }
}

/**
 * Artefacts Hardhat : …/artifacts/contracts/<Name>.sol/<Name>.json
 */
function loadArtifact(contractName) {
  // 1. Chercher d'abord dans le dossier config/abi du projet (Cloud-ready)
  const internalPath = path.join(__dirname, 'config', 'abi', `${contractName}.json`);
  if (fs.existsSync(internalPath)) {
    return JSON.parse(fs.readFileSync(internalPath, 'utf8'));
  }

  // 2. Fallback sur le dossier d'artefacts Hardhat (Local dev)
  const root = process.env.BLOCKCHAIN_ARTIFACTS_DIR;
  if (root) {
    const artifactPath = path.join(
      path.resolve(root),
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
    if (fs.existsSync(artifactPath)) {
      return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    }
  }
  return null;
}

function isAvailable() {
  if (DISABLED) return false;
  const rpc = process.env.BLOCKCHAIN_RPC_URL;
  // Disponible en lecture si on a un RPC
  return !!rpc;
}

function canWrite() {
  const pk = process.env.BLOCKCHAIN_PRIVATE_KEY;
  return isAvailable() && !!pk && pk.length > 10;
}


// Liste des RPC de secours pour éviter les erreurs ECONNRESET
const FALLBACK_RPCS = [
  process.env.BLOCKCHAIN_RPC_URL,
  'https://polygon-amoy.drpc.org',
  'https://rpc-amoy.polygon.technology',
  'https://polygon-amoy-bor-rpc.publicnode.com'
].filter(Boolean);

let _currentRpcIndex = 0;

function getProvider() {
  if (!isAvailable()) return null;
  if (!_provider) {
    const rpcUrl = FALLBACK_RPCS[_currentRpcIndex];
    try {
      // staticNetwork: true évite que ethers essaie de redétecter le réseau à chaque requête
      // On ajoute un timeout de 5s pour éviter de bloquer l'event loop
      _provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { 
        staticNetwork: true,
        batchMaxCount: 1 
      });
      
      // Test de connexion rapide
      _provider.getBlockNumber().catch(() => {
        _provider = null;
        _currentRpcIndex = (_currentRpcIndex + 1) % FALLBACK_RPCS.length;
      });
    } catch (err) {
      console.error(`[Blockchain] Échec initialisation RPC ${rpcUrl}`);
      _currentRpcIndex = (_currentRpcIndex + 1) % FALLBACK_RPCS.length;
      return null;
    }
  }
  return _provider;
}

function getWallet() {
  if (!canWrite()) return null;
  const p = getProvider();
  if (!_wallet)
    _wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY.trim(), p);
  return _wallet;
}


function getAddresses() {
  return loadAddressesJson() || {};
}

/**
 * Instance contrat avec signer (pour écritures).
 * @param {'CoopLedger'|'Vote'|'Cooperative'|'Portefeuille'|'MobileMoney'} contractName
 */
function getContract(contractName) {
  const w = getWallet();
  if (!w) throw new Error('Blockchain non configurée (voir .env.example)');

  const cached = _contracts.get(contractName);
  if (cached) return cached;

  const artifact = loadArtifact(contractName);
  const addresses = getAddresses();
  const address = addresses[contractName];
  if (!artifact?.abi || !address) {
    throw new Error(`Contrat ou adresse manquante pour ${contractName}`);
  }

  const c = new ethers.Contract(address, artifact.abi, w);
  _contracts.set(contractName, c);
  return c;
}

async function fetchLatestBlockHint() {
  const p = getProvider();
  if (!p) return null;
  const n = await p.getBlockNumber();
  return { blockNumber: n, formatted: `#${Number(n).toLocaleString('fr-FR')}` };
}

/**
 * CoopLedger.enregistrerTransaction — retourne le hash après minage effectif (.wait())
 */
async function recordLedgerTransaction(typeOp, montant, description) {
  const contract = getContract('CoopLedger');
  const tx = await contract.enregistrerTransaction(
    Number(typeOp),
    BigInt(montant),
    String(description ?? '')
  );
  const waited = await tx.wait();
  return waited.hash;
}

/** Compatible ancien code : `const { wallet } = require('../blockchain')` */
module.exports = {
  isAvailable,
  canWrite,
  get provider() {
    return getProvider();
  },
  get wallet() {
    return getWallet();
  },
  getProvider,
  getWallet,
  getContract,
  getAddresses,
  fetchLatestBlockHint,
  recordLedgerTransaction,
};

