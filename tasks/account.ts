import type { Wallet } from "ethers";

import { task } from "hardhat/config";
import { utils } from "ethers"
import { getAccount, getProvider } from "../utils";

task("accounts", "Print the main account balance")
    .setAction(async (_, _hre) => {
        const signer: Wallet = getAccount();
        let account = signer.address;
        const provider = getProvider();
        let balance = await provider.getBalance(account);

        console.log(`Address: ${account}\nBalance: ${utils.formatEther(balance)} MILKTADA`);
    });