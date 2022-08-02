import { utils, Wallet, providers, Contract, ContractFactory } from "ethers";
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

export function getArtifact(path: string) {
    const rootPath = require('app-root-path');
    let artifact;
    try {
        artifact = loadJsonFile(`${rootPath}/${path}`);
        return artifact['abi'];
    } catch (e) {
        console.error(e);
    }
};

export function getContract(contractName: string, contractFile: string, contractAddress?: string) {
    const account = getAccount();
    if (contractAddress !== undefined && utils.isAddress(contractAddress)) {
        const artifact = getArtifact(contractFile);
        return new Contract(contractAddress, artifact.abi, account)
    } else {
        const artifact = getArtifact(contractFile);
        return new ContractFactory(artifact.abi, artifact.bytecode, account);
    }
};

