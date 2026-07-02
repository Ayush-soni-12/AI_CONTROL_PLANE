import { ethers } from "ethers";
import fs from "fs";

async function main() {
  // Use public Avalanche Fuji RPC
  const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
  
  // Use the admin private key
  const wallet = new ethers.Wallet("bbcf6daae8eadc905a02bdf36eeda1e1bcab5dae5b62feae3445eb1872b835eb", provider);

  // Read the compiled smart contract artifact
  const artifactStr = fs.readFileSync("./artifacts/contracts_src/AgentRegistry.sol/AgentRegistry.json", "utf8");
  const artifact = JSON.parse(artifactStr);

  // Create the Contract Factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying AgentRegistry contract...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  
  console.log("Registry successfully deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error("Error deploying contract:", error);
  process.exitCode = 1;
});
