// Unit-Test of Mim-Token Deployment, Minting and Transfers

const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("Mim-Token", () => {

    const decimals = 6;
    // const initialSupply = 100 * Math.pow(10, decimals);
    const initialSupply = ethers.utils.parseEther("100");
    let Contract;
    let token;
    let accounts;
    let owner;
    let ownerAddr;
    it("Deployment", async () => {
        accounts = await ethers.getSigners();

        Contract = await ethers.getContractFactory("MimToken");
        token = await Contract.deploy(`${initialSupply}`);
        await token.deployed();

        expect(token.address).not.empty;
    })

    it("Getting Balance of Owner ( = InitialSupply = totalSupply )", async () => {
        owner = await ethers.getSigner();
        ownerAddr = await owner.getAddress();
        expect(await token.totalSupply()).equal(initialSupply);
        expect(await token.balanceOf(`${ownerAddr}`)).equal(initialSupply);
    });

    describe("Minting", () => {
        it("Minting to Owner Account", async () => {
            const value = ethers.utils.parseEther("100");
            // That's becaue we have two different implementations of mint function
            await token["mint(uint256)"](`${value}`);
            const newBalance = await token.balanceOf(ownerAddr);
            expect(ethers.utils.formatEther(newBalance))
                .equal(ethers.utils.formatEther(BigInt(initialSupply) + BigInt(value)));
        });

        it("Minting to another account", async () => {
            const targetAddr = await accounts[1].getAddress();
            const value = ethers.utils.parseEther("10");
            await token["mint(address,uint256)"](`${targetAddr}`, `${value}`);
            expect(await token.balanceOf(`${targetAddr}`)).equal(value);
        });
    })

    describe("Burning", () => {
        it("Burn token from Owner account", async () => {
            const value = ethers.utils.parseEther("100");
            const balanceBeforeBurn = await token.balanceOf(`${ownerAddr}`);
            await token["burn(uint256)"](`${value}`);
            const balanceAfterBurn = await token.balanceOf(`${ownerAddr}`);
            expect(balanceBeforeBurn).equal(BigInt(balanceAfterBurn) + BigInt(value));
        });

        it("Burn token from another account", async () => {
            const targetAddr = await accounts[1].getAddress();
            const value = ethers.utils.parseEther("2");
            const balanceBeforeBurn = await token.balanceOf(`${targetAddr}`);
            await token["burn(address,uint256)"](`${targetAddr}`, `${value}`);
            const balanceAfterBurn = await token.balanceOf(`${targetAddr}`);
            expect(balanceBeforeBurn).equal(BigInt(balanceAfterBurn) + BigInt(value));
        });
    })

    describe("Transfers", () => {
        it("Transfer from Owner account to a target account", async () => {
            const targetAddr = await accounts[1].getAddress();
            const value = ethers.utils.parseEther("10");
            const balanceBeforeTransfer = await token.balanceOf(`${targetAddr}`);
            await token.transfer(`${targetAddr}`, `${value}`);
            const balanceAfterTransfer = await token.balanceOf(`${targetAddr}`);
            expect(balanceAfterTransfer).equal(BigInt(balanceBeforeTransfer) + BigInt(value));
        })

        it("Transfer from one account to a target account using Allowance mechanism", async () => {
            const fromSigner = accounts[1];
            const fromAddr = await fromSigner.getAddress();
            const targetAddr = await accounts[2].getAddress();
            const value = ethers.utils.parseEther("2");
            await token.connect(fromSigner).approve(`${ownerAddr}`, `${value}`);
            await token.connect(fromSigner).increaseAllowance(`${ownerAddr}`, `${value}`);
            const balanceBeforeTransfer = await token.balanceOf(`${targetAddr}`);
            await token.connect(owner).transferFrom(`${fromAddr}`, `${targetAddr}`, `${value}`);
            const balanceAfterTransfer = await token.balanceOf(`${targetAddr}`);
            expect(balanceAfterTransfer).equal(BigInt(balanceBeforeTransfer) + BigInt(value));
        })
    })
});

