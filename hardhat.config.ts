import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import dotenv from "dotenv";

import "./tasks";

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 50,
            },
          },
        },
      ],
  },
  defaultNetwork: "milkomedaTest",
  networks: {
    milkomedaTest: {
      url: `${process.env.MILKOMEDAT_URL}`,
      chainId: 200101,
      accounts: process.env.MILKOMEDAT_PK !== undefined ? [process.env.MILKOMEDAT_PK] : []
    },
    milkomedaMain: {
      url: `${process.env.MILKOMEDAM_URL}`,
      chainId: 2001,
      accounts: process.env.MILKOMEDAM_PK !== undefined ? [process.env.MILKOMEDAM_PK] : []
    }
  },
  mocha: {
    timeout: 60000,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  typechain: {
    outDir: "./typechain",
    target: "ethers-v5"
  }
};

export default config;
