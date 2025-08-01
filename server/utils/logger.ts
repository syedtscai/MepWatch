/**
 * Production-ready logging service
 * Replaces console.log statements with structured logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  service?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private log(level: LogLevel, message: string, service?: string, metadata?: Record<string, unknown>): void {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      service,
      metadata
    };

    // Add to memory (for monitoring dashboard)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      const levelName = LogLevel[level];
      const servicePrefix = service ? `[${service}] ` : '';
      const timestamp = entry.timestamp.toLocaleTimeString();
      console.log(`${timestamp} ${levelName} ${servicePrefix}${message}`, metadata || '');
    }
  }

  error(message: string, service?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, service, metadata);
  }

  warn(message: string, service?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, service, metadata);
  }

  info(message: string, service?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, service, metadata);
  }

  debug(message: string, service?: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, service, metadata);
  }

  // Get recent logs for monitoring dashboard
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel, limit: number = 100): LogEntry[] {
    return this.logs.filter(log => log.level === level).slice(-limit);
  }
}

export const logger = new Logger();