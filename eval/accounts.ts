import { ethers } from "hardhat";

export async function getOwnerAccount() {
  return (await ethers.getSigners())[0];
}

export async function getMachineAccount() {
  return (await ethers.getSigners())[1];
}

export async function getUserAccount() {
  return (await ethers.getSigners())[2];
}