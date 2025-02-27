import bodyParser from "body-parser";
import express, { Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = { nodes: Node[] };

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  const nodesReg: Node[] = []; 

  _registry.post("/registerNode", async (req, res) => {
    const { nodeId, pubKey }: RegisterNodeBody = req.body;
    if (nodeId == undefined || pubKey == undefined) {
      return res.status(400).json({error : "Missing nodeId or pubKey"});
    }
    if (nodesReg.some(node => node.nodeId === nodeId)) {
      return res.status(400).json({error : "Node already registered"});
    }
    nodesReg.push({ nodeId, pubKey });
    return res.json({ nodeId, pubKey });
  }); 

  _registry.get("/getNodeRegistry", (req, res: Response<GetNodeRegistryBody>) => {
    res.json({ nodes: nodesReg });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}