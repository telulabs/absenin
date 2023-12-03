import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { generateCode, generateRoot, generateProof } from "../actors/machine";
import { getMachineAccount } from "./accounts";

const DIR_RELATIVE = "../out/generate-code/";
const DIR = path.resolve(__dirname, DIR_RELATIVE);

function writeCSVHeader(pathToFile: string) {
  const header =
    "," +
    "code" +
    "," +
    "root" +
    "," +
    "proof" +
    "\n";
  fs.appendFileSync(pathToFile, header);
}

function writeCSVBody(
  pathToFile: string,
  epoch: number,
  codeGenerationElapsedTime: number,
  rootGenerationElapsedTime: number,
  proofGenerationElapsedTime: number
) {
  const elements = [codeGenerationElapsedTime, rootGenerationElapsedTime, proofGenerationElapsedTime];
  const body = epoch + "," + elements.join() + "\n";
  fs.appendFileSync(pathToFile, body);
}

async function runBenchmark(
  pathToFile: string,
  numberOfCodes: number,
  epoch: number
) {
  const machine = await getMachineAccount();

  const codeGenerationStart = performance.now();
  const codes = generateCode(machine.address, numberOfCodes);
  const codeGenerationEnd = performance.now();

  const rootGenerationStart = performance.now();
  const { tree, root } = generateRoot(codes);
  const rootGenerationEnd = performance.now();

  const proofGenerationStart = performance.now();
  const generatedProofs = new Map();
  for (let i=0; i<codes.length;i++) {
    const { proofs, leaf } = generateProof(codes[i], tree);
    generatedProofs.set(leaf, proofs);
  }
  const proofGenerationEnd = performance.now();

  const codeGenerationElapsedTime = codeGenerationEnd - codeGenerationStart;
  const rootGenerationElapsedTime = rootGenerationEnd - rootGenerationStart;
  const proofGenerationElapsedTime = proofGenerationEnd - proofGenerationStart;

  writeCSVBody(
    pathToFile,
    epoch,
    codeGenerationElapsedTime,
    rootGenerationElapsedTime,
    proofGenerationElapsedTime
  );
}

async function runScenario(
  numberOfCodes: number,
  totalEpoch: number
) {
  console.log(`Running generate-code case with ${numberOfCodes} codes`);

  const filename =
    "generate-code-with-" +
    numberOfCodes.toString() +
    ".csv";
  const pathToFile = path.join(DIR, filename);

  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true });
  }
  if (fs.existsSync(pathToFile)) {
    fs.unlinkSync(pathToFile);
  }

  writeCSVHeader(pathToFile);

  for (let i = 0; i < totalEpoch; i++) {
    await runBenchmark(pathToFile, numberOfCodes, i);
  }
}

async function main() {
  const totalEpoch = 1;
  await runScenario(28800, totalEpoch);
  await runScenario(43200, totalEpoch);
  await runScenario(86400, totalEpoch);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});