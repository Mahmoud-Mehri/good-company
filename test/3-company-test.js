const { expect } = require('chai');
const { network, ethers } = require('hardhat');

describe("Testing Good Company!", () => {
    let company;
    let mimToken;
    let companyNFT;

    let accounts;
    // accounts[0] is the company`s main account
    // accounts[1..5] are Stake Holders 
    // accounts[10..15] are Employees;

    let ownerAccount;
    let ownerAddress;

    let employeeAccount;
    let employeeAddress;
    let requestId;

    const mineNewBlocks = async (blockCount) => {
        if (blockCount < 1) return;

        for (let i = 1; i <= blockCount; i++) {
            await company.provider.send('evm_mine'); // Mine a new block and increase BlockNumber
        }
    }

    const createNewSampleRequest = async (account, address, value) => {
        const response = await company.connect(account).createRequest(
            `${address}`,
            ethers.utils.parseEther(`${value}`),
            "I need to buy a new Laptop!"
        );
        const [requestEvent] = (await response.wait()).events;
        return requestEvent.args.proposalId;
    }

    describe("Deploying tokens and main contract", () => {
        before(async () => {
            accounts = await ethers.getSigners();
            ownerAccount = accounts[0];
            ownerAddress = await ownerAccount.getAddress();
        });

        it("Deploying Mim-Token", async () => {
            const Contract = await ethers.getContractFactory("MimToken");
            mimToken = await Contract.deploy(`${ethers.utils.parseEther("1000000")}`);
            await mimToken.deployed();

            expect(mimToken.address).not.empty;
        });

        it("Deploying Company NFT", async () => {
            const Contract = await ethers.getContractFactory("CompanyNFT");
            companyNFT = await Contract.deploy();
            await companyNFT.deployed();

            expect(companyNFT.address).not.empty;
        });

        it("Deploying Company Contract", async () => {
            const Contract = await ethers.getContractFactory("GoodCompany");
            company = await Contract.deploy(companyNFT.address, mimToken.address);
            await company.deployed();

            expect(company.address).not.empty;
        })
    })

    describe("Initializing Tokens and Company data", () => {

        it("Minting Company NFTs", async () => {
            // accounts[1..5] are NFT Holders
            for (let i = 1; i <= 5; i++) {
                const address = await accounts[i].getAddress();
                for (let j = 1; j <= i; j++) {
                    await companyNFT.mint(`${address}`);
                }
                const balance = await companyNFT.balanceOf(`${address}`);
                expect(balance).equal(i);
            }
        });

        it("Transferring MimToken to the account of Company contract", async () => {
            const value = ethers.utils.parseEther("100000");
            const balanceBeforeTransfer = await mimToken.balanceOf(`${company.address}`);
            await mimToken.transfer(`${company.address}`, `${value}`);
            const balanceAfterTransfer = await mimToken.balanceOf(`${company.address}`);
            expect(balanceAfterTransfer).equal(BigInt(balanceBeforeTransfer) + BigInt(value));
        })

        it("Registering Company Stake Holders", async () => {
            // accounts[1..5] are Stake Holders
            for (let i = 1; i <= 5; i++) {
                const address = await accounts[i].getAddress();
                await company.registerStakeHolder(`${address}`);
                const isStakeHolder = await company.isStakeHolder(`${address}`);
                expect(isStakeHolder).true;
            }
        });

        it("Stake Holders should give Delegation to their own accounts", async () => {
            for (let i = 1; i <= 4; i++) {
                const address = await accounts[i].getAddress();
                await companyNFT.connect(accounts[i]).delegate(`${address}`);
                const delegateAddress = await companyNFT.delegates(`${address}`);
                expect(delegateAddress).equal(address);
            }
        })

        it("Registering Stake Holder which has no Company NFT, should be failed", async () => {
            const address = await accounts[6].getAddress();
            await expect(company.registerStakeHolder(`${address}`))
                .to.be.revertedWith("This account has no balance of Company NFT");
        });

        it("Registering Employees", async () => {
            // accounts[10..15] are Employees
            for (let i = 10; i <= 15; i++) {
                const address = await accounts[i].getAddress();
                await company.registerEmployee(`${address}`);
                const isEmployee = await company.isEmployee(`${address}`);
                expect(isEmployee).true;
            }
        });

        it("Registering Duplicate Employees should be failed", async () => {
            // accounts[10..15] are Employees
            const address = await accounts[12].getAddress();
            await expect(company.registerEmployee(`${address}`))
                .to.be.revertedWith("This account is already an Employee");
        });
    })

    describe("Managing Requests", () => {
        it("Create a new Request with an Employee account", async () => {
            employeeAccount = accounts[10];
            employeeAddress = await employeeAccount.getAddress();
            requestId = await createNewSampleRequest(employeeAccount, employeeAddress, 100);
            const state = await company.getRequestState(`${requestId}`);
            expect(state).equal(0); // State.Pending = 0
        })

        it("Cancelling a request by using another account should be failed", async () => {
            await expect(company.cancelRequest(`${requestId}`))
                .to.be.revertedWith("You are not Creator of this request");
        })

        it("Cancelling a request by using the Creator account", async () => {
            await company.connect(employeeAccount).cancelRequest(`${requestId}`);
            const newState = await company.getRequestState(`${requestId}`);
            expect(newState).equal(2); // State.Cancelled = 2
        })

        it("A Stake Holder should not be able to create a request", async () => {
            const stakeHolderAccount = accounts[1];
            const stakeHolderAddress = await stakeHolderAccount.getAddress();
            await expect(company.connect(stakeHolderAccount).createRequest(
                `${stakeHolderAddress}`,
                ethers.utils.parseEther("100"),
                "I need more money!"
            )).to.be.revertedWith("You are not an Employee!");
        })
    })

    describe("Voting Process", () => {
        before(async () => {
            employeeAccount = accounts[12];
            employeeAddress = await employeeAccount.getAddress();
            requestId = await createNewSampleRequest(employeeAccount, employeeAddress, 1000);
        });

        it("Casting vote to a request which is not Active yet should be failed", async () => {
            let account = accounts[3]; // Vote-Power = 3
            await expect(company.connect(account).castVote(`${requestId}`, 1))
                .to.be.revertedWith("Governor: vote not currently active");
        })

        it("Request`s state should be changed to Active", async () => {
            const currBlockNum = await company.provider.getBlockNumber();
            const snapshot = await company.proposalSnapshot(`${requestId}`);
            await mineNewBlocks(snapshot - currBlockNum + 1); // Mine some blocks to meet request Start time

            const newState = await company.getRequestState(`${requestId}`);
            expect(newState).equal(1); // State.Active = 1
        })

        it("Casting vote should be failed if caller is not Stake Holder", async () => {
            await expect(company.castVote(`${requestId}`, 1))
                .to.be.revertedWith("You are not Stake Holder!");
        })

        it("Casting vote should be failed if caller is Stake Holder but has no Delegation", async () => {
            const account = accounts[5];
            await expect(company.connect(account).castVote(`${requestId}`, 1))
                .to.be.revertedWith("You don't have delegation");
        })

        it("Casting a Positive vote", async () => {
            const shAccount = accounts[1]; // Vote-Power = 1
            await company.connect(shAccount).castVote(`${requestId}`, 1);
            const voted = await company.hasVoted(`${requestId}`, `${(await shAccount.getAddress())}`);
            expect(voted).true;
        })

        it("Casting a Negative vote", async () => {
            const shAccount = accounts[2]; // Vote-Power = 2
            await company.connect(shAccount).castVote(`${requestId}`, 0);
            const [pVotes, nVotes] = await company.getRequestVotes(`${requestId}`);
            expect(nVotes).equal(2);
        })

        it("A Stake Holder can`t vote twice", async () => {
            const shAccount = accounts[2];
            await expect(company.connect(shAccount).castVote(`${requestId}`, 0))
                .to.be.revertedWith("This account is already voted");
        })

        it("Cast Negative votes to make a request as Defeated", async () => {
            let account = accounts[3]; // Vote-Power = 3
            await company.connect(account).castVote(`${requestId}`, 0);

            account = accounts[4]; // Vote-Power = 4
            await company.connect(account).castVote(`${requestId}`, 0);

            const [pVotes, nVotes] = await company.getRequestVotes(`${requestId}`);

            const currBlockNum = await company.provider.getBlockNumber();
            const deadLine = await company.proposalDeadline(`${requestId}`);

            await mineNewBlocks(deadLine - currBlockNum + 1); // Mine remaining blocks to meet request End time
            const newState = await company.getRequestState(`${requestId}`);

            expect(newState).equal(3) // State.Defeated = 3
        })

        it("Cast Positive votes to make a request as Succeeded", async () => {
            requestId = await createNewSampleRequest(employeeAccount, employeeAddress, 200);
            await mineNewBlocks(2);

            let account = accounts[1]; // Vote-Power = 1
            await company.connect(account).castVote(`${requestId}`, 1);

            account = accounts[2]; // Vote-Power = 2
            await company.connect(account).castVote(`${requestId}`, 1);

            account = accounts[3]; // Vote-Power = 3
            await company.connect(account).castVote(`${requestId}`, 0);

            account = accounts[4]; // Vote-Power = 4
            await company.connect(account).castVote(`${requestId}`, 1);

            const [pVotes, nVotes] = await company.getRequestVotes(`${requestId}`);

            const currBlockNum = await company.provider.getBlockNumber();
            const deadLine = await company.proposalDeadline(`${requestId}`);

            await mineNewBlocks(deadLine - currBlockNum + 1); // Mine remaining blocks to meet request End time
            const newState = await company.getRequestState(`${requestId}`);

            expect(newState).equal(4) // State.Succeeded = 4
        })

        it("Execution should be passed if request is Succeeded", async () => {
            const balance = await mimToken.balanceOf(`${employeeAddress}`);
            await company.executeRequest(`${requestId}`);
            const newBalance = await mimToken.balanceOf(`${employeeAddress}`);

            expect(newBalance).equal(BigInt(balance) + BigInt(ethers.utils.parseEther("200")));
        })

        it("Execution should be failed if request is still Active or not Succeeded", async () => {
            requestId = await createNewSampleRequest(employeeAccount, employeeAddress, 100);
            mineNewBlocks(5);

            await expect(company.executeRequest(`${requestId}`))
                .to.be.revertedWith("Governor: proposal not successful");
        })
    })
})