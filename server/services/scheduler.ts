import cron from 'node-cron';
import { dataSyncService } from './dataSync';

/**
 * SchedulerService - Automated task scheduling for EU Parliament data synchronization
 * 
 * Manages automated data updates to ensure the application always has current information:
 * - Daily synchronization with EU Parliament APIs at 2:00 AM UTC
 * - Automatic error handling and retry mechanisms
 * - Logging and monitoring of scheduled operations
 * 
 * Schedule: Daily at 2:00 AM UTC (optimal time when EU Parliament APIs are less busy)
 * 
 * Features:
 * - Automatic recovery from failed sync attempts
 * - Comprehensive logging for monitoring and debugging
 * - Configurable scheduling intervals
 * - Production-ready error handling
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 */
export class SchedulerService {
  private syncTask: any | null = null;
  private isRunning = false;

  /**
   * Initialize and start the automated data synchronization scheduler
   * 
   * Sets up daily sync at 2:00 AM UTC when EU Parliament APIs typically have
   * lower traffic and latest data updates are available.
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    // Schedule daily sync at 2:00 AM UTC
    // Cron format: minute hour day month day-of-week
    this.syncTask = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Starting scheduled EU Parliament data synchronization...');
      
      try {
        const { accurateDataSync } = await import('./accurateDataSync');
        await accurateDataSync.syncAccurateData();
        console.log('✅ Scheduled data synchronization completed successfully');
      } catch (error) {
        console.error('❌ Scheduled data synchronization failed:', error);
        
        // Log error details for monitoring
        console.error('Error details:', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Attempt retry after 30 minutes
        setTimeout(async () => {
          console.log('🔄 Retrying failed synchronization...');
          try {
            const { accurateDataSync } = await import('./accurateDataSync');
            await accurateDataSync.syncAccurateData();
            console.log('✅ Retry synchronization completed successfully');
          } catch (retryError) {
            console.error('❌ Retry synchronization also failed:', retryError);
          }
        }, 30 * 60 * 1000); // 30 minutes
      }
    }, {
      timezone: 'UTC'
    });

    this.isRunning = true;
    console.log('📅 EU Parliament data sync scheduler started (daily at 2:00 AM UTC)');
  }

  /**
   * Stop the automated scheduler
   */
  stop() {
    if (this.syncTask) {
      this.syncTask.stop();
      this.syncTask = null;
      this.isRunning = false;
      console.log('📅 EU Parliament data sync scheduler stopped');
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.syncTask ? '2:00 AM UTC daily' : null,
      timezone: 'UTC'
    };
  }

  /**
   * Manually trigger a data sync (useful for testing or immediate updates)
   */
  async triggerManualSync() {
    console.log('🔄 Manually triggered data synchronization...');
    
    try {
      const { accurateDataSync } = await import('./accurateDataSync');
      await accurateDataSync.syncAccurateData();
      console.log('✅ Manual data synchronization completed successfully');
      return { success: true, message: 'Data synchronization completed successfully' };
    } catch (error) {
      console.error('❌ Manual data synchronization failed:', error);
      return { 
        success: false, 
        message: 'Data synchronization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const schedulerService = new SchedulerService();