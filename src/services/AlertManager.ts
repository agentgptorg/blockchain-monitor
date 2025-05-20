import { Block, MonitoringMetrics, AlertConfig } from '../types';
import { Logger } from '../utils/Logger';
import axios from 'axios';

export class AlertManager {
  private alerts: AlertConfig[] = [];
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AlertManager');
  }

  public addAlert(config: AlertConfig): void {
    this.alerts.push(config);
    this.logger.info(`Added new alert: ${config.type}`);
  }

  public removeAlert(config: AlertConfig): void {
    this.alerts = this.alerts.filter(alert => 
      alert.type !== config.type || 
      alert.condition !== config.condition
    );
    this.logger.info(`Removed alert: ${config.type}`);
  }

  public async checkAlerts(block: Block, metrics: MonitoringMetrics): Promise<void> {
    for (const alert of this.alerts) {
      try {
        const shouldTrigger = this.evaluateAlert(alert, block, metrics);
        if (shouldTrigger) {
          await this.triggerAlert(alert, block, metrics);
        }
      } catch (error) {
        this.logger.error(`Error checking alert: ${alert.type}`, error);
      }
    }
  }

  private evaluateAlert(alert: AlertConfig, block: Block, metrics: MonitoringMetrics): boolean {
    switch (alert.type) {
      case 'transaction':
        return this.evaluateTransactionAlert(alert, block);
      case 'block':
        return this.evaluateBlockAlert(alert, block);
      case 'network':
        return this.evaluateNetworkAlert(alert, metrics);
      default:
        return false;
    }
  }

  private evaluateTransactionAlert(alert: AlertConfig, block: Block): boolean {
    const txCount = block.transactions.length;
    return this.compareValues(txCount, alert.condition, alert.threshold);
  }

  private evaluateBlockAlert(alert: AlertConfig, block: Block): boolean {
    const gasUsed = parseInt(block.gasUsed);
    const gasLimit = parseInt(block.gasLimit);
    const gasUtilization = (gasUsed / gasLimit) * 100;
    return this.compareValues(gasUtilization, alert.condition, alert.threshold);
  }

  private evaluateNetworkAlert(alert: AlertConfig, metrics: MonitoringMetrics): boolean {
    return metrics.networkStatus === 'degraded' || metrics.networkStatus === 'down';
  }

  private compareValues(value: number, condition: string, threshold: number | string): boolean {
    const thresholdNum = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
    
    switch (condition) {
      case '>':
        return value > thresholdNum;
      case '>=':
        return value >= thresholdNum;
      case '<':
        return value < thresholdNum;
      case '<=':
        return value <= thresholdNum;
      case '==':
        return value === thresholdNum;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertConfig, block: Block, metrics: MonitoringMetrics): Promise<void> {
    const alertData = {
      type: alert.type,
      condition: alert.condition,
      threshold: alert.threshold,
      block: block.number,
      timestamp: new Date().toISOString(),
      metrics
    };

    if (alert.notification.email) {
      await this.sendEmailAlert(alert.notification.email, alertData);
    }

    if (alert.notification.webhook) {
      await this.sendWebhookAlert(alert.notification.webhook, alertData);
    }

    this.logger.info(`Alert triggered: ${alert.type}`, alertData);
  }

  private async sendEmailAlert(email: string, data: any): Promise<void> {
    // Implement email sending logic here
    this.logger.info(`Sending email alert to ${email}`);
  }

  private async sendWebhookAlert(webhook: string, data: any): Promise<void> {
    try {
      await axios.post(webhook, data);
      this.logger.info(`Webhook alert sent to ${webhook}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook alert to ${webhook}`, error);
    }
  }
} 