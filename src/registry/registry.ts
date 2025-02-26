import bodyParser from "body-parser";
import express from "express";
import { webcrypto } from "crypto";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey } from "../crypto";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: {
    nodeId: number;
    pubKey: string;
  }[];
};

let nodeRegistry: Map<number, Node> = new Map();
let nodePrivateKeys: Map<number, webcrypto.CryptoKey> = new Map();

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  _registry.post("/registerNode", async (req, res) => {
    const { nodeId, pubKey }: RegisterNodeBody = req.body;

    try {
      const { publicKey, privateKey } = await generateRsaKeyPair();
      nodeRegistry.set(nodeId, { nodeId, pubKey: pubKey });
      nodePrivateKeys.set(nodeId, privateKey);

      res.status(200).send("Node registered successfully");
    } catch (error) {
      res.status(500).json({ error: "Error registering the node" });
    }
  });

  _registry.get("/getPrivateKey", async (req, res) => {
    // Get the first available private key in the map (no nodeId required)
    const firstPrivateKey = nodePrivateKeys.values().next().value;
  
    if (!firstPrivateKey) {
      return res.status(404).json({ error: "No private key available" });
    }
  
    try {
      // Export and return the private key as a base64 string
      const base64PrivateKey = await exportPrvKey(firstPrivateKey);
      return res.json({ result: base64PrivateKey });
    } catch (error) {
      return res.status(500).json({ error: "Error exporting private key" });
    }
  });  

  _registry.get("/getNodeRegistry", (req, res) => {
    const nodes: { nodeId: number; pubKey: string }[] = Array.from(nodeRegistry.values()).map(node => ({
      nodeId: node.nodeId,
      pubKey: node.pubKey
    }));

    const response: GetNodeRegistryBody = { nodes };
    res.json(response);
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}