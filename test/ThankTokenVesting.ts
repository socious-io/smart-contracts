import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

describe("ThankTokenVesting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployThankTokenVestingFixture() {
    const now = new Date();
    const startTimestamp = BigNumber.from(Math.round(now.getTime() / 1000)); // in seconds
    const duration = BigNumber.from("1"); // in seconds

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, secondOtherAccount] = await ethers.getSigners();

    const ThankTokenVesting = await ethers.getContractFactory(
      "ThankTokenVesting"
    );
    const thankTokenVesting = await ThankTokenVesting.deploy(
      otherAccount.address,
      startTimestamp,
      duration
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
      thankTokenVesting,
      startTimestamp,
      duration,
      owner,
      otherAccount,
      secondOtherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right start", async function () {
      const { thankTokenVesting, startTimestamp } = await loadFixture(
        deployThankTokenVestingFixture
      );
      expect(await thankTokenVesting.start()).to.equal(startTimestamp);
    });

    it("Should set the right duration", async function () {
      const { thankTokenVesting, duration } = await loadFixture(
        deployThankTokenVestingFixture
      );

      expect(await thankTokenVesting.duration()).to.equal(duration);
    });

    it("Should set the right beneficiary", async function () {
      const { thankTokenVesting, otherAccount } = await loadFixture(
        deployThankTokenVestingFixture
      );

      expect(await thankTokenVesting.beneficiary()).to.equal(
        otherAccount.address
      );
    });
  });

  describe("Vest tokens", function () {
    it("Should vest minted tokens", async function () {
      const { thank, thankTokenVesting, otherAccount } = await loadFixture(
        deployThankTokenVestingFixture
      );
      await thank.mint(otherAccount.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("420000000")
      );

      await thank
        .connect(otherAccount)
        .transfer(
          thankTokenVesting.address,
          ethers.utils.parseEther("420000000")
        );

      expect(await thank.balanceOf(thankTokenVesting.address)).to.equal(
        ethers.utils.parseEther("420000000")
      );

      await thankTokenVesting["release(address)"](thank.address);

      expect(await thank.balanceOf(otherAccount.address)).to.equal(
        ethers.utils.parseEther("420000000")
      );
    });
  });
});
