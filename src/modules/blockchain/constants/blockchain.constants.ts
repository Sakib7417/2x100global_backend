export const BLOCKCHAIN_ERRORS = {
  INVALID_TRANSACTION_HASH: 'Invalid transaction hash',
  TRANSACTION_NOT_FOUND: 'Transaction not found',
  TRANSACTION_FAILED: 'Transaction failed',
  INSUFFICIENT_CONFIRMATIONS: 'Insufficient confirmations',
  INVALID_NETWORK: 'Invalid network',
  INVALID_TOKEN_CONTRACT: 'Invalid token contract',
  INVALID_AMOUNT: 'Invalid amount',
  INVALID_ADDRESS: 'Invalid wallet address',
  DUPLICATE_TRANSACTION: 'Duplicate transaction hash',
  NETWORK_UNAVAILABLE: 'Network unavailable',
  CONTRACT_VERIFICATION_FAILED: 'Contract verification failed',
} as const;

export const BLOCKCHAIN_SUCCESS = {
  TRANSACTION_VERIFIED: 'Transaction verified successfully',
  TRANSACTION_SAVED: 'Transaction saved successfully',
  BALANCE_RETRIEVED: 'Balance retrieved successfully',
  TOKEN_BALANCE_RETRIEVED: 'Token balance retrieved successfully',
} as const;

export const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const NETWORKS = {
  'bsc-testnet': {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockExplorer: 'https://testnet.bscscan.com',
  },
  'bsc-mainnet': {
    chainId: 56,
    name: 'BNB Smart Chain Mainnet',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
  },
};
