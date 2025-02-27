import bodyParser from "body-parser";
import express from "express";
import { createRandomSymmetricKey, exportSymKey, importSymKey, symEncrypt, rsaEncrypt } from '../crypto';
import { REGISTRY_PORT, BASE_ONION_ROUTER_PORT, BASE_USER_PORT } from "../config";
import { GetNodeRegistryBody } from "../registry/registry";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export type nodeCircuit = { 
  nodeId: number;
  pubKey: string;
};

let lastCircuit: nodeCircuit[] | null = null;

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    console.log(`User ${userId} received message: ${message}`);
    res.send("success");
  });

  _user.get("/getLastCircuit", (req, res) => {
    if (lastCircuit) {
      const nodeIds = lastCircuit.map(node => node.nodeId);
      res.json({ result: nodeIds });
    } else {
      res.status(404).send("No circuit found");
    }
  });

  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastCircuit", (req, res) => {
    if (lastCircuit) {
      const nodeIds = lastCircuit.map(node => node.nodeId);
      res.json({ result: nodeIds });
    } else {
      res.status(404).send("No circuit found");
    }
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body as SendMessageBody;
    const response = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
    const { nodes } = await response.json() as GetNodeRegistryBody;

    lastSentMessage = message;
    console.log(`[User ${userId}] is sending a message to user ${destinationUserId}: ${message}`);

    const circuit: any[] = [];
    while (circuit.length < 3) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (!circuit.includes(randomNode)) {
            circuit.push(randomNode);
        }
    }

    lastCircuit = circuit.map((n) => n.nodeId);

    let encryptedMessage = message;
    let destination = String(BASE_USER_PORT + destinationUserId).padStart(10, '0');

    for (const node of circuit) {
        const symKeyCrypto = await createRandomSymmetricKey();
        const symKeyString = await exportSymKey(symKeyCrypto);
        const symKey = await importSymKey(symKeyString);
        const tempMessage = await symEncrypt(symKey, destination + encryptedMessage);

        destination = String(BASE_ONION_ROUTER_PORT + node.nodeId).padStart(10, '0');
        const encryptedSymKey = await rsaEncrypt(symKeyString, node.pubKey);
  
        encryptedMessage = encryptedSymKey + tempMessage;
    }
    lastCircuit = circuit.reverse();
    lastSentMessage = message;

    const entryNode = circuit[0];
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: encryptedMessage }),
    });
    res.sendStatus(200);
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}