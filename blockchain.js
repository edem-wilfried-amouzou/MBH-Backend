const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Chemin vers le projet des contrats
const CONTRACTS_PATH = "C:/Users/ds pcc/Desktop/cooledger-contracts/cooledger-contracts";

const ADDRESSES = {
    CoopLedger: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    Vote: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    Cooperative: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    Portefeuille: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    MobileMoney: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
};

const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RPC_URL = "http://127.0.0.1:8545";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

function getABI(contractName) {
    const abiPath = path.join(
        CONTRACTS_PATH,
        `artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    return artifact.abi;
}

function getContract(contractName) {
    const abi = getABI(contractName);
    const address = ADDRESSES[contractName];
    return new ethers.Contract(address, abi, wallet);
}

module.exports = {
    provider,
    wallet,
    getContract,
    ADDRESSES,
};