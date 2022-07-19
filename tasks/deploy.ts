import type { Wallet, ContractFactory, Contract } from "ethers";

import { task } from "hardhat/config";
import { getAccount, getEnvVariable, writeJsonFile } from "../utils";

/*
* Deploys a generic contract with no constructor parameters.
*/
task("deploy", "Deploys the indicated contract name")
  .addParam("name", "Name of the contract to be deployed")
  .setAction(async (taskArgs, hre) => {
    const contractName: string = taskArgs.name
    const fileName = `addresses/${contractName}-${getEnvVariable('NETWORK').toLowerCase()}.json`;

    let contract: Contract;
    let signer: Wallet = getAccount();

    const contractFactory: ContractFactory = await hre.ethers.getContractFactory(contractName, signer);

    try {
      contract = await contractFactory.deploy();
      console.log(`Contract deployed to address: ${contract.address}`)

      writeJsonFile({
        path: `/${fileName}`,
        data: { contractName: contract.address }
      })
    } catch (e) {
      alert(e)
    }

});
