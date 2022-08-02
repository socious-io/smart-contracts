import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Donate Mocks", async () => {
    async function donateSetup() {
        const MockUSDC = await artifacts.readArtifact("MockUSDC")
        const DonateArtifact = await artifacts.readArtifact("Donate")

        const [ owner, sender ] = await ethers.getSigners();
        
        const mockUSDCFactory = new ethers.ContractFactory(MockUSDC.abi, MockUSDC.bytecode, owner);
        const mockUSDCContract = await mockUSDCFactory.deploy();
        const donateFactory = new ethers.ContractFactory(DonateArtifact.abi, DonateArtifact.bytecode, owner);
        const donateContract = await donateFactory.deploy();
        
        await donateContract.addTokens(mockUSDCContract.address);

        return { owner, sender, mockUSDCContract, donateContract }
    };

    describe("Validate functionalities of MockUSDC", async () => {
        it("Should bring the properties from the token", async () => {
            const { mockUSDCContract } = await loadFixture(donateSetup);

            expect(await mockUSDCContract.name()).to.equal("USD Coin");
            expect(await mockUSDCContract.symbol()).to.equal("USDC");
            expect(await mockUSDCContract.decimals()).to.equal(18);
        });

        it("Should mit and change total supply", async () => {
            const { sender, mockUSDCContract } = await loadFixture(donateSetup);
            const threeEthers = parseUnits('3.0', 'ether')

            expect(await mockUSDCContract.totalSupply()).to.equal(0);
            expect(await mockUSDCContract.balanceOf(sender.address)).to.equal(0);

            await mockUSDCContract.mint(sender.address, threeEthers);

            expect(formatEther(await mockUSDCContract.totalSupply())).to.equal('3.0');
            expect(formatEther(await mockUSDCContract.balanceOf(sender.address))).to.equal('3.0');
        })
    });
    
    describe("Check functionalities of MockUSDC from Donate contract", async () => {
        it("Should list the expected token", async () => {
            const { mockUSDCContract, donateContract } = await loadFixture(donateSetup);

            expect(await donateContract.getToken(0)).to.equal(mockUSDCContract.address);
        })

        it("Should mint tokens for sender wallet and update total supply", async () => {
            const { sender, mockUSDCContract, donateContract } = await loadFixture(donateSetup);

            const threeEthers = parseUnits('3.0', 'ether')
            await mockUSDCContract.mint(sender.address, threeEthers);

            const newSenderDonate = donateContract.connect(sender);
            expect(formatEther(await newSenderDonate.getTokenBalance(0))).to.equal('3.0');
        })
    })
});