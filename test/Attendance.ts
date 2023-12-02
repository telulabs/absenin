import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { generateRoot, generateProof } from "../utils/crypto";

describe("Attendance", function () {
  async function deploy() {
    const [owner, machine, alice, bob, otherAccount] = await ethers.getSigners();
    const Attendance = await ethers.getContractFactory("Attendance");
    const attendance = await Attendance.deploy();
    return { attendance, owner, machine, alice, bob, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy contract without error", async function () {
      expect(await deploy()).to.not.be.reverted;
    });
  });

  describe("User Registration", function () {
    it("Should register user without error", async function () {
      const { attendance, alice } = await loadFixture(deploy);
      expect(await attendance.connect(alice).addUser()).to.not.be.reverted;
    });
  });

  describe("Machine Registration", function () {
    it("Should register machine without error", async function () {
      const { attendance, owner, machine } = await loadFixture(deploy);
      expect(await attendance.connect(owner).addMachine(machine.address)).to.not.be.reverted;
    });
  });

  describe("Root Code Registration", function () {
    it("Should register root without error", async function () {
      const { attendance, owner, machine } = await loadFixture(deploy);
      await attendance.connect(owner).addMachine(machine);
      const { tree, root } = generateRoot(machine.address, 100);
      expect(await attendance.connect(owner).recordRoot(root, machine)).to.not.be.reverted;
    });
  });

  describe("Record Attendance", function () {
    it("Should record attendance without error", async function () {
      const { attendance, owner, alice, machine } = await loadFixture(deploy);
      await attendance.connect(alice).addUser();
      await attendance.connect(owner).addMachine(machine);

      const { tree, root, codes } = generateRoot(machine.address, 4);
      await attendance.connect(owner).recordRoot(root, machine);

      const { proofs, leaf } = generateProof(codes[0], tree);
      expect(await attendance.connect(alice).recordAttendance(leaf, proofs, root, machine.address)).to.not.be.reverted;
    });

    it("should return correct arrival time", async function () {
      const { attendance, owner, alice, machine } = await loadFixture(deploy);
      await attendance.connect(alice).addUser();
      await attendance.connect(owner).addMachine(machine);
      const { tree, root, codes } = generateRoot(machine.address, 4);
      await attendance.connect(owner).recordRoot(root, machine);

      const { proofs, leaf } = generateProof(codes[0], tree);
      await attendance.connect(alice).recordAttendance(leaf, proofs, root, machine.address);

      const timeslot = await attendance.getCurrentTimeslot();
      expect(await attendance.getArriveTime(alice.address, timeslot)).to.not.equal(0);
    });

    it("should return correct leave time", async function () {
      const { attendance, owner, alice, machine } = await loadFixture(deploy);
      await attendance.connect(alice).addUser();
      await attendance.connect(owner).addMachine(machine);
      const { tree, root, codes } = generateRoot(machine.address, 4);
      await attendance.connect(owner).recordRoot(root, machine);

      const timeslot = await attendance.getCurrentTimeslot();

      // sumbit code #1
      const { proofs: firstProofs, leaf: firstLeaf } = generateProof(codes[0], tree);
      await attendance.connect(alice).recordAttendance(firstLeaf, firstProofs, root, machine.address);

      // forward time
      await time.increase(6000);

      // submit code #2
      const { proofs: secondProofs, leaf: secondLeaf } = generateProof(codes[1], tree);
      await attendance.connect(alice).recordAttendance(secondLeaf, secondProofs, root, machine.address);

      const arrivalTime = await attendance.getArriveTime(alice.address, timeslot);
      const leaveTime = await attendance.getLeaveTime(alice.address, timeslot);
      expect(leaveTime).above(arrivalTime);
    });
  });
});