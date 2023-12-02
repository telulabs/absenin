// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Attendance {
    uint256 private constant _DAY_IN_SECONDS = 86400;

    mapping(address => bool) private _users;
    mapping(address => bool) private _machines;
    mapping(bytes32 => bool) private _leaves;
    mapping(bytes32 => uint256) private _roots; // (root-hash, expired-time)
    mapping(uint256 => mapping(address => uint256[])) private _logs; // (timeslot, (user, time[]))
    address private _owner;

    event UserAdded(address sender);
    event MachineAdded(address machine, address sender);
    event RootAdded(bytes32 root, address machine, address sender);
    event AttendanceAdded(bytes32 code, uint256 time, address sender);

    error Unauthorized();
    error InvalidUser();
    error InvalidMachine();
    error InvalidRoot();
    error InvalidLeaf();
    error InvalidProof();
    error InvalidTime();

    constructor() {
        _owner = msg.sender;
    }

    function addUser() public {
        if (_users[msg.sender]) revert InvalidUser();

        _users[msg.sender] = true;

        emit UserAdded(msg.sender);
    }

    function addMachine(address machine) public {
        if (msg.sender != _owner) revert Unauthorized();
        if (_machines[machine]) revert InvalidMachine();

        _machines[machine] = true;

        emit MachineAdded(machine, msg.sender);
    }

    function recordRoot(bytes32 root, address machine) public {
        if (msg.sender != _owner) revert Unauthorized();
        if (!_machines[machine]) revert InvalidMachine();
        if (_roots[root] != 0) revert InvalidRoot();

        uint256 expiredTime = getCurrentTimeslot() + _DAY_IN_SECONDS;
        _roots[root] = expiredTime;

        emit RootAdded(root, machine, msg.sender);
    }

    function recordAttendance(
        bytes32 leaf,
        bytes32[] memory proofs,
        bytes32 root,
        address machine
    ) public {
        if (!_users[msg.sender]) revert Unauthorized();
        if (!_machines[machine]) revert InvalidMachine();
        if (_roots[root] == 0) revert InvalidRoot();
        if (_leaves[leaf]) revert InvalidLeaf();
        if (!verifyMerklePath(root, leaf, proofs)) revert InvalidProof();
        if (block.timestamp > _roots[root]) revert InvalidTime();

        _leaves[leaf] = true;
        uint256 timeslot = getCurrentTimeslot();
        _logs[timeslot][msg.sender].push(block.timestamp);

        emit AttendanceAdded(leaf, block.timestamp, msg.sender);
    }

    function getCurrentTimeslot() public view returns (uint256) {
        return block.timestamp - (block.timestamp % _DAY_IN_SECONDS);
    }

    function getArriveTime(
        address user,
        uint256 timeslot
    ) public view returns (uint256) {
        if (!_users[user]) revert InvalidUser();
        uint256[] memory times = _logs[timeslot][user];
        return times[0];
    }

    function getLeaveTime(
        address user,
        uint256 timeslot
    ) public view returns (uint256) {
        if (!_users[user]) revert InvalidUser();
        uint256[] memory times = _logs[timeslot][user];
        return times[times.length - 1];
    }

    /**
     * @notice Verify the Merkle Path, whether the given leaf hash
     * and proof can reach the root hash.
     *
     * From https://github.com/miguelmota/merkletreejs-solidity
     *
     * @param root the root hash
     * @param leaf the leaf hash
     * @param proofs the arrays of intermediary hash to reach the root
     */
    function verifyMerklePath(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proofs
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proofs.length; i++) {
            bytes32 proofElement = proofs[i];

            if (computedHash <= proofElement) {
                computedHash = keccak256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                computedHash = keccak256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }

        return computedHash == root;
    }
}
