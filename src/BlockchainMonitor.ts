import { ethers } from 'ethers';
import { BlockchainConfig, Block, Transaction, MonitoringMetrics, AlertConfig } from './types';
import { Logger } from './utils/Logger';
import { AlertManager } from './services/AlertManager';
import { MetricsCollector } from './services/MetricsCollector';

export class BlockchainMonitor {
  private provider: ethers.JsonRpcProvider;
  private config: BlockchainConfig;
  private logger: Logger;
  private alertManager: AlertManager;
  private metricsCollector: MetricsCollector;
  private isMonitoring: boolean = false;

  constructor(config: BlockchainConfig) {
    this.config = {
      network: config.network,
      apiKey: config.apiKey,
      interval: config.interval || 5000,
      alerts: config.alerts ?? true
    };

    this.logger = new Logger('BlockchainMonitor');
    this.provider = new ethers.JsonRpcProvider(this.getProviderUrl());
    this.alertManager = new AlertManager();
    this.metricsCollector = new MetricsCollector(this.provider);
  }

  private getProviderUrl(): string {
    const network = this.config.network.toLowerCase();
    const apiKey = this.config.apiKey;

    switch (network) {
      case 'ethereum':
        return `https://mainnet.infura.io/v3/${apiKey}`;
      case 'goerli':
        return `https://goerli.infura.io/v3/${apiKey}`;
      case 'sepolia':
        return `https://sepolia.infura.io/v3/${apiKey}`;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info(`Starting blockchain monitoring for ${this.config.network}`);

    try {
      // Subscribe to new blocks
      this.provider.on('block', async (blockNumber: number) => {
        await this.handleNewBlock(blockNumber);
      });

      // Initial metrics collection
      await this.metricsCollector.collectMetrics();
    } catch (error) {
      this.logger.error('Failed to start monitoring', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      this.logger.warn('Monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    this.provider.removeAllListeners();
    this.logger.info('Stopped blockchain monitoring');
  }

  private async handleNewBlock(blockNumber: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      const metrics = await this.metricsCollector.collectMetrics();
      await this.alertManager.checkAlerts(block, metrics);

      this.logger.info(`Processed block ${blockNumber}`);
    } catch (error) {
      this.logger.error(`Error processing block ${blockNumber}`, error);
    }
  }

  public async getBlock(blockNumber: number): Promise<Block> {
    const block = await this.provider.getBlock(blockNumber, true);
    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    return {
      number: block.number,
      hash: block.hash,
      timestamp: block.timestamp,
      transactions: block.transactions as Transaction[],
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString()
    };
  }

  public async getTransaction(hash: string): Promise<Transaction> {
    const tx = await this.provider.getTransaction(hash);
    if (!tx) {
      throw new Error(`Transaction ${hash} not found`);
    }

    const receipt = await this.provider.getTransactionReceipt(hash);
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value.toString(),
      blockNumber: tx.blockNumber || 0,
      timestamp: (await this.provider.getBlock(tx.blockNumber || 0))?.timestamp || 0,
      status: receipt?.status === 1 ? 'confirmed' : 'failed'
    };
  }

  public async getMetrics(): Promise<MonitoringMetrics> {
    return this.metricsCollector.collectMetrics();
  }

  public addAlert(config: AlertConfig): void {
    this.alertManager.addAlert(config);
  }

  public removeAlert(config: AlertConfig): void {
    this.alertManager.removeAlert(config);
  }
} 