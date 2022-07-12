import { ethers } from "hardhat";

async function main() {
  const Thank = await ethers.getContractFactory("Thank");
  const thank = await Thank.deploy();

  await thank.deployed();

  console.log("Thank token deployed to:", thank.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
