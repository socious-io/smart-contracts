import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Donate Mocks", async () => {
    async function donateSetup() {
        const MockUSDC = await artifacts.readArtifact("MockUSDC")
        const DonateArtifact = await artifacts.readArtifact("Donate")

        const [ owner, sender, reciever ] = await ethers.getSigners();
        
        const mockUSDCFactory = new ethers.ContractFactory(MockUSDC.abi, MockUSDC.bytecode, owner);
        const mockUSDCContract = await mockUSDCFactory.deploy();
        const donateFactory = new ethers.ContractFactory(DonateArtifact.abi, DonateArtifact.bytecode, owner);
        const donateContract = await donateFactory.deploy();
        
        await donateContract.addTokens(mockUSDCContract.address);

        return { owner, sender, reciever, mockUSDCContract, donateContract }
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
        });

        it("Should approve and get correct allowance", async () => {
            const { sender, mockUSDCContract } = await loadFixture(donateSetup);

            await mockUSDCContract.mint(sender.address, parseUnits('3.0', 'ether'));

            const newSenderUsdc = mockUSDCContract.connect(sender);

            await expect(await newSenderUsdc.approve(newSenderUsdc.address, parseUnits('1.0', 'ether')))
                .to.emit(newSenderUsdc, "Approval")
                .withArgs(sender.address, newSenderUsdc.address, parseUnits("1.0", "ether"));

            expect(formatEther(await newSenderUsdc.allowance(sender.address, newSenderUsdc.address))).to.equal('1.0');
        });
    });
    
    describe("Check functionalities from Donate using mockUSDC", async () => {
        it("Should list the expected token", async () => {
            const { mockUSDCContract, donateContract } = await loadFixture(donateSetup);

            expect(await donateContract.getToken(0)).to.equal(mockUSDCContract.address);
        });

        it("Should donate and update the balances from owner, sender and organization", async () => {
            const { owner, sender, reciever, mockUSDCContract, donateContract } = await loadFixture(donateSetup);

            await mockUSDCContract.mint(sender.address, parseUnits('3.0', 'ether'));

            const senderDonate = donateContract.connect(sender);
            const senderUsdc = mockUSDCContract.connect(sender);

            await expect(await senderUsdc.approve(senderDonate.address, parseUnits("1.0", "ether")))
                .to.emit(senderUsdc, "Approval")
                .withArgs(sender.address, senderDonate.address, parseUnits("1.0", "ether"));
            
            const expectedFee = (parseUnits("1.0", "ether")).div(100);
            const expectedDonation = (parseUnits("1.0", "ether")).sub(expectedFee);

            await expect(await senderDonate.donate(123, reciever.address, 
                    parseUnits("1.0", "ether"), 0))
                .to.emit(senderDonate, "Donation")
                .withArgs(expectedFee, expectedDonation, reciever.address);

            expect(formatEther(await mockUSDCContract.balanceOf(sender.address))).to.equal("2.0");
            expect(formatEther(await mockUSDCContract.balanceOf(owner.address))).to.equal(formatEther(expectedFee));
            expect(formatEther(await mockUSDCContract.balanceOf(reciever.address))).to.equal(formatEther(expectedDonation));
        });
    });
});