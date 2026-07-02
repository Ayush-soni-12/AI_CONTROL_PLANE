require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: { sources: "./contracts_src" },
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: ["bbcf6daae8eadc905a02bdf36eeda1e1bcab5dae5b62feae3445eb1872b835eb"] 
    }
  }
};
