import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { generateCode, generateRoot, generateProof } from "../actors/machine";

import { getMachineAccount, getOwnerAccount, getUserAccount } from "./accounts";
import { ethers } from "hardhat";
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

const DIR_RELATIVE = "../out/record-attendance/";
const DIR = path.resolve(__dirname, DIR_RELATIVE);

function writeCSVHeader(pathToFile: string) {
  const header =
    "," +
    "proof" +
    "\n";
  fs.appendFileSync(pathToFile, header);
}

function writeCSVBody(
  pathToFile: string,
  epoch: number,
  recordProofElapsedTime: number
) {
  const body = epoch + "," + recordProofElapsedTime + "\n";
  fs.appendFileSync(pathToFile, body);
}

async function deploy() {
  const Attendance = await ethers.getContractFactory("Attendance");
  const attendance = await Attendance.deploy();
  return attendance;
}

async function runBenchmark(
  pathToFile: string,
  numberOfCodes: number,
  epoch: number
) {
  const owner = await getOwnerAccount();
  const machine = await getMachineAccount();
  const user = await getUserAccount();
  const attendance = await loadFixture(deploy);

  await attendance.connect(owner).addMachine(machine.address);
  await attendance.connect(user).addUser();

  const codes = generateCode(machine.address, numberOfCodes);
  const { tree, root } = generateRoot(codes);
  const { proofs, leaf } = generateProof(codes[4], tree);

  await attendance.connect(owner).recordRoot(root, machine.address);

  const recordProofStart = performance.now();
  await attendance.connect(user).recordAttendance(leaf, proofs, root, machine.address);
  const recordProofEnd = performance.now();

  const recordProofElapsedTime = recordProofEnd - recordProofStart;

  if (epoch == 0) {
    return; // skip the first
  }

  writeCSVBody(
    pathToFile,
    epoch,
    recordProofElapsedTime
  );
}

async function runScenario(
  numberOfCodes: number,
  totalEpoch: number
) {
  console.log(`Running record-attendance case with ${numberOfCodes} codes`);

  const filename =
    "record-attendance-with-" +
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
  const totalEpoch = 11;
  await runScenario(28800, totalEpoch);
  await runScenario(43200, totalEpoch);
  await runScenario(86400, totalEpoch);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});