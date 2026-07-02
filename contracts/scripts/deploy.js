const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log("Registry deployed to:", await registry.getAddress());
}

main().catch((error) => { 
  console.error(error); 
  process.exitCode = 1; 
});
