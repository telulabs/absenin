import * as crypto from "crypto";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

function generateCode(machine: string, numberOfCodes: number) {
  const codes: string[] = [];
  let i = 0;
  while (i < numberOfCodes) {
    const code = crypto.randomBytes(64).toString("hex");
    const dataToHash = machine + code;
    const h = "0x" + crypto.createHash("sha256").update(dataToHash).digest("hex");
    codes.push(h);
    i++;
  }
  return codes;
}

export function generateRoot(machine: string, numberOfCodes: number) {
  const codes = generateCode(machine, numberOfCodes);
  const leaves = codes.map(v => keccak256(v));
  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();
  return { tree, root, codes };
}

export function generateProof(code: string, tree: MerkleTree) {
  const leaf = keccak256(code);
  const proofs = tree.getHexProof(leaf);
  return { proofs, leaf };
}