# good-company 

![Test](https://github.com/Mahmoud-Mehri/good-company/actions/workflows/node.js.yml/badge.svg)

# A Smart Contract based on OZ Governor

The Scenario:

There is a good company that listens to their employees!. They have made a governance system to get requests from their employees, after creating a request, Stake Holders will cast their votes to the request to show if they are agree to take care of the given request or not.

The success quorum is 51%, if the request acheived this amount of Positive votes, the company will take care of the request.

The Request here means Transferring an specific amount of Money to a specific account.

The Money here means a custom ERC20 Token named MimToken.

The main contract which named GoodCompany implemented based on OZ Governance contract and using a custom ERC721 (NFT) Token named CompanyNFT.

The source of those Tokens is also included.

To run test:

```
npm install
npx hardhat test:jest
```

