export interface BlockchainConfig {
  network: string;
  apiKey?: string;
  interval?: number;
  alerts?: boolean;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  transactions: Transaction[];
  gasUsed: string;
  gasLimit: string;
}

export interface MonitoringMetrics {
  blockHeight: number;
  transactionCount: number;
  averageGasPrice: string;
  networkStatus: 'healthy' | 'degraded' | 'down';
  lastUpdate: number;
}

export interface AlertConfig {
  type: 'transaction' | 'block' | 'network';
  condition: string;
  threshold: number | string;
  notification: {
    email?: string;
    webhook?: string;
  };
}

export interface MonitoringStats {
  totalBlocks: number;
  totalTransactions: number;
  averageBlockTime: number;
  networkUtilization: number;
  errorRate: number;
} 