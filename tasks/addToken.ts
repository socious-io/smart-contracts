import type { Contract, Wallet } from "ethers";

import { task } from "hardhat/config";
import { getAccount, getEnvVariable, loadJsonFile } from "../utils";

task("addToken", "Add a new Interface to target contract")
    .addParam("name", "Name of the contract to get the addition")
    .addParam("address", "Token address to be added")
    .setAction(async (taskArgs, hre) => {
        const contractName: string = taskArgs.name
        const tokenAddress: string = taskArgs.address
        const fileName = loadJsonFile(`addresses/${contractName}-${getEnvVariable('NETWORK').toLowerCase()}.json`);

        let contract: Contract;
        let signer: Wallet = getAccount();

        try {
            contract = await hre.ethers.getContractAt(contractName, 
                fileName.contractName, signer);
            await contract.addTokens(tokenAddress);
            console.log(`The token ${tokenAddress} has been added to\
            the contract ${contractName} at address ${contract.address}`);
        } catch (e) {
            console.error(e);
        };
    });