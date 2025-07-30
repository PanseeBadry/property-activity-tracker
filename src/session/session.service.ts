import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserSession, UserSessionDocument, SessionStatus } from '../schemas/user-session.schema';
import { SalesRep, SalesRepDocument } from '../schemas/sales-rep.schema';

export interface CreateSessionData {
  salesRepId: string;
  socketId: string;
  ipAddress: string;
  userAgent: string;
  connectionLocation?: {
    lat: number;
    lng: number;
  };
  metadata?: Record<string, string>;
}

export interface SessionStats {
  totalActiveSessions: number;
  totalOnlineUsers: number;
  averageSessionDuration: number;
  sessionsToday: number;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    @InjectModel(UserSession.name)
    private userSessionModel: Model<UserSessionDocument>,
    @InjectModel(SalesRep.name)
    private salesRepModel: Model<SalesRepDocument>,
  ) {}

  /**
   * Create a new user session when a user connects
   */
  async createSession(data: CreateSessionData): Promise<UserSession> {
    try {
      // First, cleanup any existing sessions for this socket (in case of reconnection)
      await this.cleanupSocketSessions(data.socketId);

      // Check if user has other active sessions
      const existingSessions = await this.getActiveSessionsByUser(data.salesRepId);
      
      // Create new session
      const session = new this.userSessionModel({
        ...data,
        status: SessionStatus.ACTIVE,
        connectedAt: new Date(),
        lastActivity: new Date(),
        lastHeartbeat: new Date(),
      });

      const savedSession = await session.save();

      // Update user's online status
      await this.updateUserOnlineStatus(data.salesRepId, true);

      this.logger.log(`Session created for user ${data.salesRepId} with socket ${data.socketId}`);
      
      // If user had multiple sessions, log this information
      if (existingSessions.length > 0) {
        this.logger.log(`User ${data.salesRepId} now has ${existingSessions.length + 1} active sessions`);
      }

      return savedSession;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * End a user session when they disconnect
   */
  async endSession(socketId: string): Promise<UserSession | null> {
    try {
      const session = await this.userSessionModel.findOne({
        socketId,
        status: SessionStatus.ACTIVE,
      });

      if (!session) {
        this.logger.warn(`No active session found for socket ${socketId}`);
        return null;
      }

      const now = new Date();
      const sessionDuration = now.getTime() - session.connectedAt.getTime();

      // Update session
      session.status = SessionStatus.INACTIVE;
      session.disconnectedAt = now;
      session.sessionDuration = sessionDuration;
      const updatedSession = await session.save();

      // Check if user has any other active sessions
      const remainingSessions = await this.getActiveSessionsByUser(session.salesRepId);
      
      // If no other active sessions, mark user as offline
      if (remainingSessions.length === 0) {
        await this.updateUserOnlineStatus(session.salesRepId, false);
      }

      this.logger.log(`Session ended for socket ${socketId}. Duration: ${this.formatDuration(sessionDuration)}`);
      
      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to end session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update session heartbeat to keep it alive
   */
  async updateHeartbeat(socketId: string): Promise<boolean> {
    try {
      const result = await this.userSessionModel.updateOne(
        { socketId, status: SessionStatus.ACTIVE },
        { 
          lastHeartbeat: new Date(),
          lastActivity: new Date(),
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update heartbeat for socket ${socketId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(socketId: string, activityType?: string): Promise<boolean> {
    try {
      const updateData: any = { lastActivity: new Date() };
      
      if (activityType) {
        updateData['metadata.lastActivityType'] = activityType;
      }

      const result = await this.userSessionModel.updateOne(
        { socketId, status: SessionStatus.ACTIVE },
        updateData
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Failed to update activity for socket ${socketId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all active sessions for a specific user
   */
  async getActiveSessionsByUser(salesRepId: string): Promise<UserSession[]> {
    return this.userSessionModel.find({
      salesRepId,
      status: SessionStatus.ACTIVE,
    }).exec();
  }

  /**
   * Get session by socket ID
   */
  async getSessionBySocket(socketId: string): Promise<UserSession | null> {
    return this.userSessionModel.findOne({
      socketId,
      status: SessionStatus.ACTIVE,
    }).exec();
  }

  /**
   * Get all currently online users
   */
  async getOnlineUsers(): Promise<string[]> {
    const sessions = await this.userSessionModel.distinct('salesRepId', {
      status: SessionStatus.ACTIVE,
    });
    return sessions;
  }

  /**
   * Get comprehensive session statistics
   */
  async getSessionStats(): Promise<SessionStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeSessions,
      onlineUsers,
      avgDuration,
      todaySessions,
    ] = await Promise.all([
      this.userSessionModel.countDocuments({ status: SessionStatus.ACTIVE }),
      this.userSessionModel.distinct('salesRepId', { status: SessionStatus.ACTIVE }),
      this.getAverageSessionDuration(),
      this.userSessionModel.countDocuments({
        connectedAt: { $gte: today },
      }),
    ]);

    return {
      totalActiveSessions: activeSessions,
      totalOnlineUsers: onlineUsers.length,
      averageSessionDuration: avgDuration,
      sessionsToday: todaySessions,
    };
  }

  /**
   * Get user's session history
   */
  async getUserSessionHistory(salesRepId: string, limit: number = 10): Promise<UserSession[]> {
    return this.userSessionModel
      .find({ salesRepId })
      .sort({ connectedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Check if a user is currently online
   */
  async isUserOnline(salesRepId: string): Promise<boolean> {
    const activeSession = await this.userSessionModel.findOne({
      salesRepId,
      status: SessionStatus.ACTIVE,
    });
    return !!activeSession;
  }

  /**
   * Cleanup sessions for a specific socket (handles reconnections)
   */
  private async cleanupSocketSessions(socketId: string): Promise<void> {
    await this.userSessionModel.updateMany(
      { socketId, status: SessionStatus.ACTIVE },
      { 
        status: SessionStatus.INACTIVE,
        disconnectedAt: new Date(),
      }
    );
  }

  /**
   * Update user's online status in SalesRep collection
   */
  private async updateUserOnlineStatus(salesRepId: string, isOnline: boolean): Promise<void> {
    const updateData: any = { isOnline };
    
    if (!isOnline) {
      updateData.lastOnline = new Date();
    }

    await this.salesRepModel.findByIdAndUpdate(salesRepId, updateData);
  }

  /**
   * Get average session duration
   */
  private async getAverageSessionDuration(): Promise<number> {
    const result = await this.userSessionModel.aggregate([
      {
        $match: {
          status: { $in: [SessionStatus.INACTIVE, SessionStatus.EXPIRED] },
          sessionDuration: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$sessionDuration' }
        }
      }
    ]);

    return result.length > 0 ? result[0].avgDuration : 0;
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Cleanup expired sessions (runs every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      const expiredThreshold = new Date(now.getTime() - this.SESSION_TIMEOUT);
      const heartbeatThreshold = new Date(now.getTime() - this.HEARTBEAT_TIMEOUT);

      // Find sessions that are expired (no heartbeat for too long)
      const expiredSessions = await this.userSessionModel.find({
        status: SessionStatus.ACTIVE,
        $or: [
          { lastHeartbeat: { $lt: heartbeatThreshold } },
          { lastActivity: { $lt: expiredThreshold } },
        ]
      });

      if (expiredSessions.length > 0) {
        // Update expired sessions
        await this.userSessionModel.updateMany(
          {
            _id: { $in: expiredSessions.map(s => s._id) },
          },
          {
            status: SessionStatus.EXPIRED,
            disconnectedAt: now,
          }
        );

        // Update user online status for affected users
        const affectedUsers = [...new Set(expiredSessions.map(s => s.salesRepId))];
        
        for (const userId of affectedUsers) {
          const remainingSessions = await this.getActiveSessionsByUser(userId);
          if (remainingSessions.length === 0) {
            await this.updateUserOnlineStatus(userId, false);
          }
        }

        this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired sessions: ${error.message}`, error.stack);
    }
  }

  /**
   * Cleanup old inactive sessions (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldSessions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.userSessionModel.deleteMany({
        status: { $in: [SessionStatus.INACTIVE, SessionStatus.EXPIRED] },
        disconnectedAt: { $lt: thirtyDaysAgo },
      });

      this.logger.log(`Cleaned up ${result.deletedCount} old sessions from database`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old sessions: ${error.message}`, error.stack);
    }
  }
}