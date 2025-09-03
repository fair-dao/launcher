# FairdaoFactory Smart Contract Documentation

[View English Documentation](README.md) | [查看中文文档](README_CN.md)

## Overview
FairdaoFactory is a smart contract deployed on the TRON blockchain that provides a robust infrastructure for deploying and managing other smart contracts using the CREATE2 opcode. It features role-based access control with super admin and manager roles, allowing for secure and controlled contract deployment.

## Core Features

#### 1. CREATE2 Contract Deployment
- Allows authorized managers to deploy new contracts using the CREATE2 opcode
- Enables predictable contract addresses based on salt and bytecode
- Ensures deterministic deployment regardless of block number or transaction order

#### 2. Address Prediction
- Provides functionality to predict the address of a contract before deployment
- Useful for front-running protection and advanced use cases requiring prior address knowledge

#### 3. Role-Based Access Control
- Implements a multi-tier permission system with super admin and manager roles
- Super admin has full control, including adding/removing managers and transferring super admin rights
- Managers are authorized to deploy contracts and predict addresses

#### 4. Admin Management
- Super admin can add new managers with the `addManager` function
- Super admin can remove existing managers with the `removeManager` function
- Prevents removing the super admin account from the manager list

#### 5. Super Admin Transfer
- Allows the current super admin to transfer their role to another address using `transferSuperAdmin`
- Automatically grants manager status to the new super admin
- Prevents transferring to zero address

## Testing Methods

The FairdaoFactory contract is tested using Mocha with the following test cases:

#### 1. Deployment and Initialization
- Verifies contract deployment with the correct super admin
- Checks initial permissions and state

#### 2. Permission Management
- Tests adding and removing managers by super admin
- Validates access control for non-super admin accounts
- Ensures super admin cannot be removed as a manager

#### 3. Contract Deployment (CREATE2)
- Tests successful contract deployment by authorized managers
- Verifies address prediction functionality
- Validates rejection of deployments by non-admin accounts
- Ensures rejection of empty bytecode deployments

#### 4. Super Admin Transfer
- Validates successful transfer of super admin rights
- Ensures new super admin is granted manager status
- Verifies rejection of transfers by non-super admin accounts
- Checks rejection of transfers to zero address

#### 5. Access Control Modifiers
- Tests `onlySuperAdmin` and `isAdmin` modifiers
- Validates function access for different user roles

## Running Tests
To run the tests, use the following command from the project root directory:
```
npx mocha src/test/FairdaoFactory.test.js --timeout 10000
```