require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // networks: {
  //   hardhat: {
  //     mining: {
  //       auto: false,
  //       interval: 2000
  //     }
  //   }
  // },
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100
      }
    }
  }
};
