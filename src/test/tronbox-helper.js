// 导入必要的依赖 / Import necessary dependencies
const { TronWeb } = require('tronweb');
const fs = require('fs');
/**
 * 延迟函数 / Delay function
 * @param {number} ms - 延迟的毫秒数 / Delay in milliseconds
 * @returns {Promise} - 返回一个 Promise，在指定时间后解析 / Promise that resolves after specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建 TronWeb 实例 / Create TronWeb instance
 * @param {string} privateKey - 私钥（可选）/ Private key (optional)
 * @param {string} networkName - 网络名称（可选）/ Network name (optional)
 * @returns {TronWeb} - TronWeb 实例 / TronWeb instance
 */
function getTronWeb( networkConfig,privateKey) {
  return new TronWeb({
    fullHost: networkConfig.fullHost,
    eventServer: networkConfig.eventServer || networkConfig.fullHost,
    timeout: 30000,
    privateKey: privateKey || networkConfig.privateKey
  });
}


async function deployContract(tronWeb, abi, bytecode, params = [], options = {}) {
  try {   
    // 设置默认部署选项 / Set default deployment options
    const deployOptions = {
      abi: abi,
      bytecode: bytecode,
      feeLimit: options.feeLimit || 1000000000,
      callValue: options.callValue || 0,
      userFeePercentage: options.userFeePercentage || 100,
      parameters: params
    };
    
    // 部署合约 / Deploy contract
    const contractInstance = await tronWeb.contract().new(deployOptions);
    return contractInstance;
  } catch (error) {
    console.error('Error deploying contract:', error.message);
    throw error;
  }
}


async function runContractResult(tronWeb, fun) {
  try {
    // 执行合约函数 / Execute contract function
    const txID = await fun();
    // 等待交易确认 / Wait for transaction confirmation
    await sleep(1000);
    
    // 获取交易结果 / Get transaction result
    const result = await tronWeb.trx.getTransaction(txID);
    
    if (result && result.ret && result.ret[0] && result.ret[0].contractRet === 'SUCCESS') {
      return true;
    } else {
      console.log(
        'Transaction failed:',
        result ? result.ret[0].contractRet : 'Unknown error'
      );
      return false;
    }
  } catch (error) {
    console.error('Error executing contract:', error.message);
    return false;
  }
}

/**
 * 获取网络中的账户 / Get accounts from network
 * @param {string} networkConfig - 网络名称（可选）/ Network name (optional)
 * @returns {Promise<Array>} - 账户私钥数组 / Array of account private keys
 */
async function getAccounts(networkConfig) {
 
  if (networkConfig["network_id"] === '9') {  // deployment
    try {
      const tron = getTronWeb(networkConfig,'');
      const data = await tron.fullNode.request('/admin/accounts-json');
      return data.privateKeys;
    } catch (error) {
      console.error('Error getting accounts from development network:', error.message);
      // 回退到配置中的私钥 / Fall back to private key in config
      return networkConfig.privateKeys || [networkConfig.privateKey];
    }
  } else {
    // 返回配置中的私钥 / Return private keys from config
    return networkConfig.privateKeys || [networkConfig.privateKey];
  }
}


// 导出所有公共函数 / Export all public functions
module.exports = {
  sleep,
  getTronWeb,
  deployContract,
  runContractResult,
  getAccounts
};
