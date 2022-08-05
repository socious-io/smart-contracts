import { Contract } from "ethers";

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
            const tokenAddress = await connectedContract.getToken(tokenIndex);

            const tokenContract = await hre.ethers.getContractAt( "ERC20", tokenAddress );

            const tokenName = await tokenContract.name();
            const tokenSymbol = await tokenContract.symbol();
            const tokenDecimals = await tokenContract.decimals();


            console.log(`The token at index ${tokenIndex} from contract ${contractName} at \
                address ${contract.address} is:\n\tName: ${tokenName}\tSymbol: ${tokenSymbol}\tDecimals: ${tokenDecimals}\n`);
        } catch (e) {
            console.error(e);
        };
    });