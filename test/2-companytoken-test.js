// Unit-Test of Company NFT Deployment, Minting and Transfers
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Company NFT Token", () => {

    let Contract;
    let token;
    let accounts;
    let ownerAddr;

    let firstTokenId;
    let secondTokenId;
    it("Deployment", async () => {
        accounts = await ethers.getSigners();

        Contract = await ethers.getContractFactory("CompanyNFT");
        token = await Contract.deploy();
        await token.deployed();

        expect(token.address).not.empty;
    })

    describe("Minting", () => {
        it("Minting and checking Balance", async () => {
            ownerAddr = await (await ethers.getSigner()).getAddress();
            const response = await token.mint(`${ownerAddr}`);
            const [transferEvent] = (await response.wait()).events;
            firstTokenId = transferEvent.args.tokenId;
            const balance = await token.balanceOf(`${ownerAddr}`);
            expect(balance).equal(1);
        });

        it("Minting and checking Ownership", async () => {
            const newAddr = await accounts[1].getAddress();
            const response = await token.mint(`${newAddr}`);
            const [transferEvent] = (await response.wait()).events;
            secondTokenId = transferEvent.args.tokenId;
            const newOwner = await token.ownerOf(`${secondTokenId}`);
            expect(newAddr).equal(newOwner);
        });
    })

    describe("Burning", () => {
        it("Burn token from owner account", async () => {
            await token.burn(`${firstTokenId}`);
            const isTokenExists = await token.exists(`${firstTokenId}`);
            expect(isTokenExists).false;
        });

        it("Burning should be failed if the caller is not the owner", async () => {
            await expect(token.burn(`${secondTokenId}`)).to.be
                .revertedWith("Caller is not Token Owner nor Approve");
        })
    })

    describe("Transfers", async () => {
        it("Transfering from an address without Owner priviledge should be failed", async () => {
            const newAddr = await accounts[1].getAddress();
            await expect(token.transferFrom(`${newAddr}`, `${ownerAddr}`, `${secondTokenId}`))
                .to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        })

        it("Transfer from one account to another with Owner priviledge should be passed", async () => {
            const newAddr = await accounts[1].getAddress();
            await token.connect(accounts[1]).transferFrom(`${newAddr}`, `${ownerAddr}`, `${secondTokenId}`);
            const newOwner = await token.ownerOf(`${secondTokenId}`);
            expect(newOwner).equal(ownerAddr);
        })

        it("Transfering a token which is burned should be failed", async () => {
            const newAddr = await accounts[1].getAddress();
            await expect(token.transferFrom(`${ownerAddr}`, `${newAddr}`, `${firstTokenId}`))
                .to.be.revertedWith("ERC721: operator query for nonexistent token");
        })

    })
});
