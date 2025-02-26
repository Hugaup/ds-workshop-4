import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey } from '../crypto';

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;

  try {
    const { publicKey } = await generateRsaKeyPair();
    const pubKey = await exportPubKey(publicKey);
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, { nodeId, pubKey });
    console.log(`Node ${nodeId} registered successfully`);
  } catch (error) {
    console.error(`Error registering node ${nodeId}:`, error);
  }

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.post("/receiveMessage", (req, res) => {
    const { encryptedMessage, decryptedMessage, destinationPort } = req.body;
    lastReceivedEncryptedMessage = encryptedMessage;
    lastReceivedDecryptedMessage = decryptedMessage;
    lastMessageDestination = destinationPort;

    res.send("Message received");
  });

  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}