import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Escrow", async () => {
    async function escrowSetup() {
        const MockUSDC = await artifacts.readArtifact("MockUSDC");
        const EscrowArtifact = await artifacts.readArtifact("Escrow");

        const [ owner, sender, reciever ] = await ethers.getSigners();

        const mockUsdcFactory = new ethers.ContractFactory(MockUSDC.abi, 
            MockUSDC.bytecode, owner);
        const mockUsdcContract = await mockUsdcFactory.deploy();
        const escrowFactory = new ethers.ContractFactory(EscrowArtifact.abi,
            EscrowArtifact.bytecode, owner);
        const escrowContract = await escrowFactory.deploy();
        
        await escrowContract.addTokens(mockUsdcContract.address);

        return { owner, sender, reciever, 
                mockUsdcContract, escrowContract };
    };

    describe("Validate token interface from Escrow", async () => {
        it("Should bring the properties from the token", async () => {
            const { mockUsdcContract, escrowContract } = await loadFixture(escrowSetup);

            expect(await escrowContract.getToken(0))
                .to.equal(mockUsdcContract.address);
        });
    });

    describe("Make and escrow and transfer funds correctly", async () => {
        const { owner, sender, reciever, 
            mockUsdcContract, escrowContract } = await loadFixture(escrowSetup);

        await mockUsdcContract.mit(sender.address, parseUnits("3.0", "ether"));

        const senderUsdc = mockUsdcContract.connect(sender);
        const senderEscrow = escrowContract.connect(sender);
        const oneEther = parseUnits("1.0", "ether");

        await expect(await senderUsdc.approve(
                escrowContract.address, oneEther))
            .to.emit(senderUsdc, "Approval")
            .withArgs(sender.address, escrowContract.addres, oneEther);
        
        const expectedFees = ((oneEther.div(100)).mul(10))
                .add((oneEther.div(100)).mul(3));
        const expectedAmmount = oneEther.sub(expectedFees);
        
        await expect(await senderEscrow.newEscrow(
                reciever.address, 123, 1, 
                oneEther, 0))
            .to.emit(escrowContract, "EscrowAction")
            .withArgs(expectedFees, expectedAmmount, 
                sender.address, reciever.address);

        expect(formatEther(await mockUsdcContract.balanceOf(escrowContract.address)))
                .to.equal("1.0");
        
        await expect(await senderEscrow.withdrawFunds(
                reciever.address,
                123,
                oneEther,
                0))
            .to.emit(escrowContract, "EscrowAction")
            .withArgs(expectedFees, expectedAmmount, 
                sender.address, reciever.address);

        expect(formatEther(await mockUsdcContract.balanceOf(sender.address)))
            .to.equal("2.0");
        expect(formatEther(await mockUsdcContract.balanceOf(owner.address)))
            .to.equal(formatEther(expectedFees));
        expect(formatEther(await mockUsdcContract.balanceOf(reciever.address)))
            .to.equal(formatEther(expectedAmmount));
    });

    describe("Resolution for escrow decision and helper functions", async () => {
        it("Should refund to organization", async () => {
            const { owner, sender, reciever, 
                mockUsdcContract, escrowContract } = await loadFixture(escrowSetup);

            await mockUsdcContract.mint(sender.address, parseUnits("3.0", "ether"));

            const senderUsdc = mockUsdcContract.connect(sender);
            const senderEscrow = escrowContract.connect(sender);
            const oneEther = parseUnits("1.0", "ether");
    
            await senderUsdc.approve(escrowContract.address, oneEther);
            await senderEscrow.newEscrow(
                    reciever.address, 
                    123, 
                    1, 
                    oneEther, 
                    0);
            
            const expectedFee = (oneEther.div(100)).mul(
                await senderEscrow.getDecisionRetentionFee());
            const expectedRefund = oneEther.sub(expectedFee);
            const escrowId = (await senderEscrow.getTransactionNumber(
                sender.address,
                reciever.address,
                123,
                oneEther
            )).sub(1);

            await expect(await escrowContract.escrowDecision(
                    0,
                    reciever.address,
                    sender.address,
                    123,
                    oneEther,
                    0,
                    { gasLimit: 100000 }))
                .to.emit(escrowContract, "DecisionNotification")
                .withArgs(
                    sender.address,
                    reciever.address,
                    escrowId,
                    expectedRefund,
                    expectedFee);

            expect(formatEther(await mockUsdcContract.balanceOf(sender.address)))
                .to.equal(formatEther((parseUnits("3.0", "ether")).sub(expectedFee)));
            expect(formatEther(await mockUsdcContract.balanceOf(owner.address)))
                .to.equal(formatEther(expectedFee));
            expect(formatEther(await mockUsdcContract.balanceOf(reciever.address)))
                .to.equal("0.0");
        });

        it("Should refund to contributor", async() => {
            const { owner, sender, reciever, 
                mockUsdcContract, escrowContract } = await loadFixture(escrowSetup);

            await mockUsdcContract.mint(sender.address, parseUnits("3.0", "ether"));

            const senderUsdc = mockUsdcContract.connect(sender);
            const senderEscrow = escrowContract.connect(sender);
            const oneEther = parseUnits("1.0", "ether");
    
            await senderUsdc.approve(escrowContract.address, oneEther);
            await senderEscrow.newEscrow(
                    reciever.address, 
                    123, 
                    1, 
                    oneEther, 
                    0);
            
            const expectedFees = ((oneEther.div(100)).mul(10))
                .add((oneEther.div(100)).mul(3));
            const expectedAmmount = oneEther.sub(expectedFees);

            await expect(await escrowContract.escrowDecision(
                1,
                reciever.address,
                sender.address,
                123,
                oneEther,
                0,
                { gasLimit: 125000 }))
            .to.emit(escrowContract, "DecisionNotification")
            .withArgs(
                sender.address,
                reciever.address,
                0,
                expectedAmmount,
                expectedFees);

            expect(formatEther(await mockUsdcContract.balanceOf(sender.address)))
                .to.equal("2.0");
            expect(formatEther(await mockUsdcContract.balanceOf(owner.address)))
                .to.equal(formatEther(expectedFees));
            expect(formatEther(await mockUsdcContract.balanceOf(reciever.address)))
                .to.equal(formatEther(expectedAmmount));
        });
    });
});