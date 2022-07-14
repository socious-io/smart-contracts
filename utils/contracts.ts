import { utils, Wallet, providers, Contract } from "ethers";
import { getEnvVariable } from "./misc";
import { loadJsonFile } from "./json";

export function getProvider() {
    let network: string = getEnvVariable(`${getEnvVariable("NETWORK", "MILKOMEDAT")}_URL`);
    return new providers.JsonRpcProvider(network);
};

function getPrivateKey() {
    const inputKey: string = getEnvVariable(`${getEnvVariable("NETWORK")}_PK`);
    let privateKey;
    if (utils.isHexString(inputKey)) {
        privateKey = inputKey;
    }
    else {
        privateKey = "0x" + inputKey
    }
    return new utils.SigningKey(privateKey);
}

export function getAccount() {
    return new Wallet(getPrivateKey(), getProvider());
};

function getAbi(contractName: string, fileName?: string) {
    let artifact;
    try {
        if (fileName !== undefined) {
            artifact = loadJsonFile(`artifacts/contracts/${fileName}.sol/${contractName}.json`);
        } else {
            artifact = loadJsonFile(`artifacts/contracts/${contractName}.sol/${contractName}.json`);
        }
        return artifact['abi'];
    } catch (e) {
        console.error(e);
    }
};

export function getContract(contractName: string, contractAddress: string, contractFile?: string) {
    const account = getAccount();
    if (contractAddress !== undefined && utils.isAddress(contractAddress)) {
        const contractAbi = getAbi(contractName, contractFile);
        return new Contract(contractAddress, contractAbi, account)
    } else {
        return new Contract(contractName, getEnvVariable(`${contractName}`), account)
    }
};

