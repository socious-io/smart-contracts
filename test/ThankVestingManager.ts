import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { ThankTokenVesting } from "../typechain/contracts/ThankTokenVesting";

describe("TokenVesting", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployThankTokenVestingFixture() {
    const coreTeamSharePercentage = 10;
    const contributorsSharePercentage = 5;
    const seedSharePercentage = 5;
    const privateSaleSharePercentage = 5;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, secondOtherAccount] = await ethers.getSigners();
    const Thank = await ethers.getContractFactory("Thank");
    const thank = await Thank.deploy();
    const thankMaxCap = await thank.getMaxCap();

    const coreTeamShare = thankMaxCap.div(100).mul(coreTeamSharePercentage);
    const contributorShare = thankMaxCap
      .div(100)
      .mul(contributorsSharePercentage);
    const seedShare = thankMaxCap.div(100).mul(seedSharePercentage);
    const privateSaleShare = thankMaxCap
      .div(100)
      .mul(privateSaleSharePercentage);

    const ThankVestingManager = await ethers.getContractFactory(
      "ThankVestingManager"
    );
    const thankVestingManager = await ThankVestingManager.deploy(thank.address);

    // transfer 25% of the tokens to the Vesting Manager
    await thank
      .connect(owner)
      .transfer(thankVestingManager.address, thankMaxCap.div(100).mul(25));

    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    const stakingRewards = await StakingRewards.deploy(
      thank.address,
      thank.address
    );

    await thank.setStakingRewards(stakingRewards.address);

    return {
      coreTeamSharePercentage,
      contributorsSharePercentage,
      seedSharePercentage,
      privateSaleSharePercentage,
      coreTeamShare,
      contributorShare,
      seedShare,
      privateSaleShare,
      thank,
      thankMaxCap,
      thankVestingManager,
      owner,
      otherAccount,
      secondOtherAccount,
    };
  }

  const vest = async (
    owner: SignerWithAddress,
    thankVestingManager: Contract,
    otherAccount: SignerWithAddress,
    thank: Contract,
    coreTeamShare: BigNumber,
    config: BigNumber
  ) => {
    const previousBalance = await thank.balanceOf(thankVestingManager.address);

    const beneficiary = otherAccount.address;
    const amount = ethers.utils.parseEther("10000");

    const createTransaction = await thankVestingManager
      .connect(owner)
      .createVesting(beneficiary, amount, config);

    createTransaction.wait();
    expect(createTransaction)
      .to.emit(thankVestingManager, "VestingCreated")
      .withArgs(beneficiary, amount, config);

    expect(await thankVestingManager.availableAmount(config)).to.equal(
      coreTeamShare.sub(amount)
    );

    expect(await thank.balanceOf(thankVestingManager.address)).to.equal(
      previousBalance.sub(amount)
    );

    const vestings = await thankVestingManager.getVestingsForABeneficiary(
      beneficiary
    );

    expect(await thank.balanceOf(vestings[0])).to.equal(amount);

    const cancelTransaction = await thankVestingManager
      .connect(owner)
      .cancelVesting(beneficiary, vestings[0]);

    cancelTransaction.wait();
    expect(cancelTransaction)
      .to.emit(thankVestingManager, "VestingCanceled")
      .withArgs(beneficiary, amount, config, vestings[0]);
  };

  describe("Deployment", function () {
    it("Should set the right thank token", async function () {
      const { thankVestingManager, thank } = await loadFixture(
        deployThankTokenVestingFixture
      );
      expect(await thankVestingManager.thankToken()).to.equal(thank.address);
    });

    it("Should init the right configs for core team", async function () {
      const { thankVestingManager, coreTeamShare } = await loadFixture(
        deployThankTokenVestingFixture
      );

      const config = await thankVestingManager.vestingConfigs(
        thankVestingManager.CORE_TEAM_CONFIG()
      );
      expect(config.share).to.equal(coreTeamShare);
      expect(config.cliff).to.equal(BigNumber.from("63072000"));
      expect(config.duration).to.equal(BigNumber.from("126144000"));
      expect(config.allocated).to.equal(BigNumber.from("0"));
    });

    it("Should init the right configs for contributors", async function () {
      const { thankVestingManager, contributorShare } = await loadFixture(
        deployThankTokenVestingFixture
      );

      const config = await thankVestingManager.vestingConfigs(
        thankVestingManager.CONTRIBUTOR_CONFIG()
      );
      expect(config.share).to.equal(contributorShare);
      expect(config.cliff).to.equal(BigNumber.from("31536000"));
      expect(config.duration).to.equal(BigNumber.from("63072000"));
      expect(config.allocated).to.equal(BigNumber.from("0"));
    });

    it("Should init the right configs for seed", async function () {
      const { thankVestingManager, seedShare } = await loadFixture(
        deployThankTokenVestingFixture
      );

      const config = await thankVestingManager.vestingConfigs(
        thankVestingManager.SEED_CONFIG()
      );
      expect(config.share).to.equal(seedShare);
      expect(config.cliff).to.equal(BigNumber.from("7890000"));
      expect(config.duration).to.equal(BigNumber.from("31536000"));
      expect(config.allocated).to.equal(BigNumber.from("0"));
    });

    it("Should init the right configs for private sale", async function () {
      const { thankVestingManager, privateSaleShare } = await loadFixture(
        deployThankTokenVestingFixture
      );

      const config = await thankVestingManager.vestingConfigs(
        thankVestingManager.PRIVATE_SALE_CONFIG()
      );
      expect(config.share).to.equal(privateSaleShare);
      expect(config.cliff).to.equal(BigNumber.from("7890000"));
      expect(config.duration).to.equal(BigNumber.from("31536000"));
      expect(config.allocated).to.equal(BigNumber.from("0"));
    });
  });

  describe("Vest tokens", function () {
    it("Should vest for a core team member", async function () {
      const { owner, thankVestingManager, otherAccount, thank, coreTeamShare } =
        await loadFixture(deployThankTokenVestingFixture);
      await vest(
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        coreTeamShare,
        await thankVestingManager.CORE_TEAM_CONFIG()
      );
    });

    it("Should vest for a contributor", async function () {
      const {
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        contributorShare,
      } = await loadFixture(deployThankTokenVestingFixture);

      await vest(
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        contributorShare,
        await thankVestingManager.CONTRIBUTOR_CONFIG()
      );
    });

    it("Should vest for seed", async function () {
      const { owner, thankVestingManager, otherAccount, thank, seedShare } =
        await loadFixture(deployThankTokenVestingFixture);

      await vest(
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        seedShare,
        await thankVestingManager.SEED_CONFIG()
      );
    });

    it("Should vest for private sale", async function () {
      const {
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        privateSaleShare,
      } = await loadFixture(deployThankTokenVestingFixture);

      await vest(
        owner,
        thankVestingManager,
        otherAccount,
        thank,
        privateSaleShare,
        await thankVestingManager.PRIVATE_SALE_CONFIG()
      );
    });
  });

  describe("Cancel Vesting", function () {});
});
