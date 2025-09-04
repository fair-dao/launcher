// 导入必要的依赖和辅助函数 / Import necessary dependencies and helper functions
const chai = require("chai");
const {
  getTronWeb,
  deployContract,
  runContractResult,
  getAccounts,
  sleep,
} = require("./tronbox-helper.js");

// 导入 tronbox 配置文件 / Import tronbox configuration file
const tronboxConfig = require("../tronbox-config.js");
const deployFactoryJson = require("../build/contracts/FairdaoFactory.json");
let networkConfig = tronboxConfig.networks["nile"]; // 选择网络 / Select Nile network development

// 设置断言 / Set up assertions
const assert = chai.assert;
const log = console.log;

// Simple test contract bytecode for testing CREATE2 deployment / 简单的测试合约字节码，用于测试 CREATE2 部署
const TEST_CONTRACT_BYTECODE =
  "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea2646970667358221220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85564736f6c63430008180033";

describe("FairdaoFactory Test", () => {
  let fairdaoFactory;
  let tronWeb;
  let accounts;
  let accountHexAddress0, accountHexAddress1, accountHexAddress2;
  let accountBase58Address0, accountBase58Address1, accountBase58Address2;
  let fairdaoFactoryAddress = "TPDy6d5Wmwa32rPLCpqtdTBeHADvZqQSok"; // Address of the fairdaoFactory contract, will be automatically created if not specified / fairdaoFactory 合约的地址，未指定将自动创建该合约
  // Setup before deploying contract / 部署合约前的设置
  before(async () => {
    // 获取账户 / Get accounts
    accounts = await getAccounts(networkConfig);

    // 创建 TronWeb 实例 / Create TronWeb instance
    tronWeb = getTronWeb(networkConfig, accounts[0]);
    accountBase58Address0 = tronWeb.address.fromPrivateKey(accounts[0]);
    accountHexAddress0 = tronWeb.address.toHex(accountBase58Address0);
    accountBase58Address1 = tronWeb.address.fromPrivateKey(accounts[1]);
    accountHexAddress1 = tronWeb.address.toHex(accountBase58Address1);
    accountBase58Address2 = tronWeb.address.fromPrivateKey(accounts[2]);
    accountHexAddress2 = tronWeb.address.toHex(accountBase58Address2);
    try {
      if (!fairdaoFactoryAddress) {
        // 部署合约 / Deploy contract
        fairdaoFactory = await deployContract(
          tronWeb,
          deployFactoryJson.abi,
          deployFactoryJson.bytecode,
          []
        );
        console.log(`FairdaoFactory deployed at: ${fairdaoFactory.address}`);
      } else {
        fairdaoFactory = tronWeb.contract(
          deployFactoryJson.abi,
          fairdaoFactoryAddress
        );
      }
    } catch (error) {
      console.error("Error deploying FairdaoFactory:", error);
      throw error;
    }
  });

  // Test contract deployment and initial state / 测试合约部署和初始状态
  describe("Deployment and Initialization", () => {
    
    it("should deploy successfully and set superAdmin correctly", async () => {
      const currentSuperAdmin = await fairdaoFactory.superAdmin().call();
      assert.equal(
        currentSuperAdmin,
        accountHexAddress0,
        "Super admin should be the deployer"
      );
    });

    it("should set deployer as a manager", async () => {
      const isDeployerManager = await fairdaoFactory
        .isManager(accountHexAddress0)
        .call();
      assert.isTrue(isDeployerManager, "Deployer should be a manager");
    });
  });

  // Test permission management functionality / 测试权限管理功能
  describe("Permission Management", () => {
    // Test adding manager / 测试添加管理员
    describe("addManager", () => {
      it("should allow super admin to add a new manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .addManager(accountBase58Address1)
            .send({ from: accounts[0] });
        });
        const isManager = await fairdaoFactory
          .isManager(accountBase58Address1)
          .call();

        assert.isTrue(isManager, "Manager should be added");
        // In TRON, event handling is slightly different, we need to check transaction results instead of events / 在 TRON 中，事件处理方式略有不同，我们需要检查交易结果而不是事件
        assert.isTrue(result, "Transaction should be successful");
      });

      it("should not allow non-super admin to add a manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .addManager(accountBase58Address1)
            .send({ from: accounts[1] });
        });
        assert.isFalse(result, "Transaction should not be successful");
      });

      it("should not allow adding zero address as manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .addManager("0x0000000000000000000000000000000000000000")
            .send({ from: accounts[0] });
        });

        assert.isFalse(result, "Transaction should not be successful");
      });

      it("should not allow adding an existing manager again", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .addManager(accountBase58Address1)
            .send({ from: accounts[0] });
        });

        assert.isFalse(
          result,
          "Should not allow adding an existing manager again"
        );
      });
    });

    // Test removing manager / 测试移除管理员
    describe("removeManager", () => {
      before(async () => {
        await fairdaoFactory
          .removeManager(accountBase58Address1)
          .send({ from: accounts[0] });
        sleep(2000);
        await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .addManager(accountBase58Address1)
            .send({ from: accounts[0] });
        });
        sleep(2000);
      });

      it("should allow super admin to remove a manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .removeManager(accountBase58Address1)
            .send({ from: accounts[0] });
        });
        const isManager = await fairdaoFactory
          .isManager(accountBase58Address1)
          .call();

        assert.isFalse(isManager, "Manager should be removed");
        assert.isTrue(result, "Transaction should be successful");
      });

      it("should not allow non-super admin to remove a manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .removeManager(accountBase58Address1)
            .send({ from: accounts[2] });
        });

        assert.isFalse(result, "Transaction should not be successful");
      });

      it("should not allow removing super admin", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .removeManager(accountBase58Address0)
            .send({ from: accounts[0] });
        });

        assert.isFalse(result, "Should not allow removing super admin");
      });

      it("should not allow removing a non-manager", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .removeManager(accountBase58Address2)
            .send({ from: accounts[0] });
        });

        assert.isFalse(result, "Should not allow removing a non-manager");
      });
    });

    // Test super admin transfer / 测试超级管理员转移
    describe("transferSuperAdmin", () => {
      it("should allow super admin to transfer super admin rights", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .transferSuperAdmin(accountBase58Address2)
            .send({ from: accounts[0] });
        });
        const currentSuperAdmin = await fairdaoFactory.superAdmin().call();
        const isNewAdminManager = await fairdaoFactory
          .isManager(accountBase58Address2)
          .call();

        assert.equal(
          currentSuperAdmin,
          accountHexAddress2,
          "Super admin should be transferred"
        );
        assert.isTrue(isNewAdminManager, "New super admin should be a manager");
        assert.isTrue(result, "Transaction should be successful");
      });

      it("should not allow non-super admin to transfer super admin rights", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .transferSuperAdmin(accountBase58Address2)
            .send({ from: accounts[1] });
        });

        assert.isFalse(result, "Transaction should not be successful");
      });

      it("should not allow transferring super admin to zero address", async () => {
        let result = await runContractResult(tronWeb, function () {
          return fairdaoFactory
            .transferSuperAdmin("0x0000000000000000000000000000000000000000")
            .send({ from: accounts[0] });
        });

        assert.isFalse(result, "Transaction should not be successful");
      });
    });
  });

  // Test contract deployment functionality / 测试合约部署功能
  describe("Contract Deployment (CREATE2)", () => {
    const salt =
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    // First add a manager for testing deployment functionality / 先添加一个管理员用于测试部署功能
    before(async () => {
      await runContractResult(tronWeb, function () {
        return fairdaoFactory
          .addManager(accountBase58Address1)
          .send({ from: accounts[0] });
      });
    });
    

    // Test predicting contract address / 测试预测合约地址
    it("should allow manager to predict contract address", async () => {
      let tronWeb1 = getTronWeb(networkConfig,accounts[1]);
      let fairdaoFactory1 = tronWeb1.contract(
          deployFactoryJson.abi,
          fairdaoFactoryAddress
        );
        log("call address:",tronWeb1.address.fromPrivateKey(accounts[1]));
      const predictedAddress = await fairdaoFactory1
        .predictAddress(salt, TEST_CONTRACT_BYTECODE)
        .call();
      log("predictedAddress", predictedAddress);
      // 部署合约
      let result = await runContractResult(tronWeb, function () {
        return fairdaoFactory
          .deployContract(salt, TEST_CONTRACT_BYTECODE)
          .send({ from: accounts[1] });
      });

      assert.isTrue(result, "Contract should be deployed successfully");
      assert.isNotNull(
        predictedAddress,
        "Predicted address should not be null"
      );
    });
  });
});
