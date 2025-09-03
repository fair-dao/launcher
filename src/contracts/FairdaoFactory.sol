// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;
  
// Factory contract - Deploy other contracts using CREATE2 with permission management
contract FairdaoFactory {
    // Event: Triggered when a new contract is deployed
    event ContractDeployed(address indexed deployedContract, bytes32 salt);
    // Event: Triggered when a manager is added
    event ManagerAdded(address indexed manager);
    // Event: Triggered when a manager is removed
    event ManagerRemoved(address indexed manager);
    // Event: Triggered when super admin is transferred
    event SuperAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // Super admin address
    address public superAdmin;
    // Manager mapping
    mapping(address => bool) public isManager;

    // Ensure caller is super admin
    modifier isSuperAdmin() {
        require(msg.sender == superAdmin, "Caller is not super admin");
        _;
    }

    // Ensure caller is manager or super admin
    modifier isAdmin() {
        require( isManager[msg.sender], "Caller is not admin");
        _;
    }

    /**
     * Constructor
     * Initialize super admin as contract creator
     */
    constructor() {
        superAdmin = msg.sender;
        isManager[msg.sender] = true;
    }
    
    /**
     * Deploy new contract using CREATE2 (only admin can call)
     * @param salt 32-byte salt value for determining contract address
     * @param bytecode Bytecode of the contract to deploy
     * @return Address of the newly deployed contract
     */
    function deployContract(bytes32 salt, bytes memory bytecode) external isAdmin returns (address) {
        require(bytecode.length > 0, "Bytecode cannot be empty");
        
        // Deploy contract using CREATE2
        address deployedContract;
        assembly {
            deployedContract := create2(
                callvalue(), // Amount of TRX sent during deployment
                add(bytecode, 32), // Bytecode start position
                mload(bytecode), // Bytecode length
                salt // Salt value            
            )
        }
        
        require(deployedContract != address(0), "Deployment failed");
        
        emit ContractDeployed(deployedContract, salt);
        return deployedContract;
    }
    
    /**
     * Precompute contract address (without deploying)
     * @param salt 32-byte salt value
     * @param bytecode Bytecode of the contract to deploy
     * @return Precomputed contract address
     */
    function predictAddress(bytes32 salt, bytes memory bytecode) public view isAdmin returns (address) {
        bytes32 bytecodeHash = keccak256(bytecode);
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x41),
                address(this),
                salt,
                bytecodeHash
            )
        );
        
        // Take the last 20 bytes of the hash as the address
        return address(uint160(uint256(hash)));
    }

    /**
     * Add new manager (only super admin can call)
     * @param manager Address of the manager to add
     */
    function addManager(address manager) external isSuperAdmin returns(bool){
        require(manager != address(0), "Manager address cannot be zero");
        require(!isManager[manager], "Address is already a manager");
        
        isManager[manager] = true;
        emit ManagerAdded(manager);
        return true;
    }

    /**
     * Remove manager (only super admin can call)
     * @param manager Address of the manager to remove
     */
    function removeManager(address manager) external isSuperAdmin returns(bool){
        require(manager != superAdmin, "Cannot remove super admin");
        require(isManager[manager], "Address is not a manager");
        
        isManager[manager] = false;
        emit ManagerRemoved(manager);
        return true;
    }

    /**
     * Transfer super admin rights (only current super admin can call)
     * @param newAdmin Address of the new super admin
     */
    function transferSuperAdmin(address newAdmin) external isSuperAdmin returns(bool){
        require(newAdmin != address(0), "New admin address cannot be zero");
        
        address oldAdmin = superAdmin;
        superAdmin = newAdmin;
        delete isManager[oldAdmin];
        // Ensure new super admin also has manager permissions
        if (!isManager[newAdmin]) {
            isManager[newAdmin] = true;
            emit ManagerAdded(newAdmin);
        }
        
        emit SuperAdminTransferred(oldAdmin, newAdmin);
        return true;
    }
}


