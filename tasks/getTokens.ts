import type { Contract } from "ethers";

import { task } from "hardhat/config";
import { getEnvVariable, getProvider, loadJsonFile } from "../utils";

task("getToken", "Show address of token from target contract")
    .addParam("name", "Name of the contract to review")
    .addParam("index", "Index of the token")
    .setAction(async (taskArgs, hre) => {
        const contractName: string = taskArgs.name
        const tokenIndex: number = taskArgs.index
        const fileName = loadJsonFile(`addresses/${contractName}-${getEnvVariable('NETWORK').toLowerCase()}.json`);

        let contract: Contract;
        const provider = getProvider();

        try {
            contract = await hre.ethers.getContractAt(contractName, 
                fileName.contractName);
            const connectedContract = contract.connect(provider);
            const output = await connectedContract.getToken(tokenIndex);
            console.log(`The token at index ${tokenIndex} from contract ${contractName} at \
                address ${contract.address} is: ${output}\n`);
        } catch (e) {
            console.error(e);
        };
    });