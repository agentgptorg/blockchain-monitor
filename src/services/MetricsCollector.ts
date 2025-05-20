import { ethers } from 'ethers';
import { MonitoringMetrics } from '../types';
import { Logger } from '../utils/Logger';

export class MetricsCollector {
  private provider: ethers.JsonRpcProvider;
  private logger: Logger;
  private lastBlockHeight: number = 0;
  private lastUpdate: number = 0;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
    this.logger = new Logger('MetricsCollector');
  }

  public async collectMetrics(): Promise<MonitoringMetrics> {
    try {
      const [blockNumber, gasPrice, networkStatus] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.checkNetworkStatus()
      ]);

      const metrics: MonitoringMetrics = {
        blockHeight: blockNumber,
        transactionCount: await this.getTransactionCount(blockNumber),
        averageGasPrice: gasPrice.gasPrice?.toString() || '0',
        networkStatus,
        lastUpdate: Date.now()
      };

      this.lastBlockHeight = blockNumber;
      this.lastUpdate = metrics.lastUpdate;

      this.logger.info('Collected metrics', metrics);
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  private async getTransactionCount(blockNumber: number): Promise<number> {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      return block?.transactions.length || 0;
    } catch (error) {
      this.logger.error(`Failed to get transaction count for block ${blockNumber}`, error);
      return 0;
    }
  }

  private async checkNetworkStatus(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const timeSinceLastUpdate = Date.now() - this.lastUpdate;

      // If we haven't received a new block in 5 minutes, consider the network degraded
      if (timeSinceLastUpdate > 5 * 60 * 1000) {
        return 'degraded';
      }

      // If the block height hasn't changed in 2 minutes, consider the network down
      if (currentBlock === this.lastBlockHeight && timeSinceLastUpdate > 2 * 60 * 1000) {
        return 'down';
      }

      return 'healthy';
    } catch (error) {
      this.logger.error('Failed to check network status', error);
      return 'down';
    }
  }
} 