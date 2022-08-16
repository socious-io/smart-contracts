import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("TokenVesting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployThankTokenVestingFixture() {
    const now = new Date();
    const startTimestamp = BigNumber.from(Math.round(now.getTime() / 1000)); // in seconds
    const duration = BigNumber.from("1"); // in seconds

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, vestingManager] = await ethers.getSigners();

    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    const tokenVesting = await TokenVesting.deploy(
      otherAccount.address,
      startTimestamp,
      duration,
      vestingManager.address
    );

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
      tokenVesting,
      startTimestamp,
      duration,
      owner,
      otherAccount,
      vestingManager,
    };
  }

  describe("Deployment", function () {
    it("Should set the right start", async function () {
      const { tokenVesting, startTimestamp } = await loadFixture(
        deployThankTokenVestingFixture
      );
      expect(await tokenVesting.start()).to.equal(startTimestamp);
    });

    it("Should set the right duration", async function () {
      const { tokenVesting, duration } = await loadFixture(
        deployThankTokenVestingFixture
      );

      expect(await tokenVesting.duration()).to.equal(duration);
    });

    it("Should set the right beneficiary", async function () {
      const { tokenVesting, otherAccount } = await loadFixture(
        deployThankTokenVestingFixture
      );

      expect(await tokenVesting.beneficiary()).to.equal(otherAccount.address);
    });
  });

  describe("Vest tokens", function () {
    it("Should vest minted tokens", async function () {
      const { thank, tokenVesting, otherAccount } = await loadFixture(
        deployThankTokenVestingFixture
      );
      await thank.mint(otherAccount.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );

      await thank
        .connect(otherAccount)
        .transfer(tokenVesting.address, ethers.utils.parseEther("126000000"));

      expect(await thank.balanceOf(tokenVesting.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );

      await tokenVesting["release(address)"](thank.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );
    });
  });

  describe("Cancel Vesting", function () {
    it("Should return tokens to the vestingManager", async function () {
      const { thank, tokenVesting, otherAccount, vestingManager } =
        await loadFixture(deployThankTokenVestingFixture);
      await thank.mint(otherAccount.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );

      await thank
        .connect(otherAccount)
        .transfer(tokenVesting.address, ethers.utils.parseEther("126000000"));

      expect(await thank.balanceOf(tokenVesting.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );

      await tokenVesting.cancelVesting(thank.address);

      expect(await thank.balanceOf(vestingManager.address)).to.equal(
        ethers.utils.parseEther("126000000")
      );
    });
  });
});
