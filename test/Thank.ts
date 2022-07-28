import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("Thank", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployThankFixture() {
    // 100 Billion in 18 decimals
    const maxCap = ethers.utils.parseEther("100000000000");

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, secondOtherAccount] = await ethers.getSigners();

    const Thank = await ethers.getContractFactory("Thank");
    const thank = await Thank.deploy();

    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    const stakingRewards = await StakingRewards.deploy(
      thank.address,
      thank.address
    );

    await thank.setStakingRewards(stakingRewards.address);

    return {
      thank,
      stakingRewards,
      maxCap,
      owner,
      otherAccount,
      secondOtherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right maxCap", async function () {
      const { thank, maxCap } = await loadFixture(deployThankFixture);

      expect(await thank.maxCap()).to.equal(maxCap);
    });

    it("Should set the right owner", async function () {
      const { thank, owner } = await loadFixture(deployThankFixture);

      expect(await thank.hasRole(thank.DEFAULT_ADMIN_ROLE(), owner.address)).to
        .be.true;
    });
  });

  describe("Mint", function () {
    it("Should mint per the right proportion with Zero staked tokens and Zero Supply", async function () {
      const { thank, otherAccount } = await loadFixture(deployThankFixture);
      await thank.mint(otherAccount.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("420000000")
      );
    });

    it("Should mint per 50% staked tokens and 42 Million supply", async function () {
      const { thank, stakingRewards, otherAccount, secondOtherAccount } =
        await loadFixture(deployThankFixture);

      await thank.mint(otherAccount.address);

      expect(await thank.totalSupply()).to.equal(
        ethers.utils.parseEther("420000000")
      );

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("420000000")
      );

      await thank
        .connect(otherAccount)
        .approve(stakingRewards.address, ethers.utils.parseEther("210000000"));
      await stakingRewards
        .connect(otherAccount)
        .stake(ethers.utils.parseEther("210000000"));

      await thank.mint(secondOtherAccount.address);

      expect(await thank.balanceOf(secondOtherAccount.address)).to.equal(
        ethers.utils.parseEther("209118000")
      );
    });
  });
});
