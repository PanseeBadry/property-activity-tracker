import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionService } from './session.service';
import { SalesRepService } from '../sales-rep/sales-rep.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    id: string;
    [key: string]: any;
  };
}

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(
    private sessionService: SessionService,
    private salesRepService: SalesRepService,
  ) {}

  /**
   * Get session statistics
   */
  @Get('stats')
  async getSessionStats() {
    try {
      const stats = await this.sessionService.getSessionStats();
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get session stats: ${error.message}`);
    }
  }

  /**
   * Get all online users
   */
  @Get('online-users')
  async getOnlineUsers() {
    try {
      const onlineUserIds = await this.sessionService.getOnlineUsers();
      
      // Get user details for online users
      const onlineUsers = await Promise.all(
        onlineUserIds.map(async (userId) => {
          const user = await this.salesRepService.findById(userId);
          return user ? {
            id: user._id,
            name: user.name,
            score: user.score,
            isOnline: user.isOnline,
          } : null;
        })
      );

      return {
        success: true,
        data: {
          users: onlineUsers.filter(user => user !== null),
          count: onlineUsers.filter(user => user !== null).length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get online users: ${error.message}`);
    }
  }

  /**
   * Get current user's active sessions
   */
  @Get('my-sessions')
  async getMyActiveSessions(@Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user.id;
      const sessions = await this.sessionService.getActiveSessionsByUser(userId);
      
      return {
        success: true,
        data: {
          sessions: sessions.map(session => ({
            sessionId: session.socketId,
            connectedAt: session.connectedAt,
            lastActivity: session.lastActivity,
            lastHeartbeat: session.lastHeartbeat,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            connectionLocation: session.connectionLocation,
            status: session.status,
          })),
          count: sessions.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Get session history for current user
   */
  @Get('my-history')
  async getMySessionHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    try {
      const userId = req.user.sub || req.user.id;
      const sessionLimit = limit && limit > 0 ? Math.min(limit, 50) : 10;
      
      const sessions = await this.sessionService.getUserSessionHistory(userId, sessionLimit);
      
      return {
        success: true,
        data: {
          sessions: sessions.map(session => ({
            sessionId: session.socketId,
            connectedAt: session.connectedAt,
            disconnectedAt: session.disconnectedAt,
            sessionDuration: session.sessionDuration,
            status: session.status,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            connectionLocation: session.connectionLocation,
          })),
          count: sessions.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get session history: ${error.message}`);
    }
  }

  /**
   * Check if a specific user is online
   */
  @Get('user/:userId/online-status')
  async getUserOnlineStatus(@Param('userId') userId: string) {
    try {
      // Validate user exists
      const userExists = await this.salesRepService.exists(userId);
      if (!userExists) {
        throw new NotFoundException('User not found');
      }

      const isOnline = await this.sessionService.isUserOnline(userId);
      const user = await this.salesRepService.findById(userId);
      
      return {
        success: true,
        data: {
          userId,
          userName: user?.name,
          isOnline,
          lastOnline: user?.lastOnline,
          currentScore: user?.score,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get user online status: ${error.message}`);
    }
  }

  /**
   * Get session history for a specific user (admin endpoint)
   */
  @Get('user/:userId/history')
  async getUserSessionHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    try {
      // Validate user exists
      const userExists = await this.salesRepService.exists(userId);
      if (!userExists) {
        throw new NotFoundException('User not found');
      }

      const sessionLimit = limit && limit > 0 ? Math.min(limit, 50) : 10;
      const sessions = await this.sessionService.getUserSessionHistory(userId, sessionLimit);
      
      return {
        success: true,
        data: {
          userId,
          sessions: sessions.map(session => ({
            sessionId: session.socketId,
            connectedAt: session.connectedAt,
            disconnectedAt: session.disconnectedAt,
            sessionDuration: session.sessionDuration,
            status: session.status,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            connectionLocation: session.connectionLocation,
          })),
          count: sessions.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get user session history: ${error.message}`);
    }
  }

  /**
   * Get active sessions for a specific user (admin endpoint)
   */
  @Get('user/:userId/active-sessions')
  async getUserActiveSessions(@Param('userId') userId: string) {
    try {
      // Validate user exists
      const userExists = await this.salesRepService.exists(userId);
      if (!userExists) {
        throw new NotFoundException('User not found');
      }

      const sessions = await this.sessionService.getActiveSessionsByUser(userId);
      
      return {
        success: true,
        data: {
          userId,
          sessions: sessions.map(session => ({
            sessionId: session.socketId,
            connectedAt: session.connectedAt,
            lastActivity: session.lastActivity,
            lastHeartbeat: session.lastHeartbeat,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            connectionLocation: session.connectionLocation,
            status: session.status,
          })),
          count: sessions.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get user active sessions: ${error.message}`);
    }
  }

  /**
   * Force end a specific session (admin endpoint)
   */
  @Delete('session/:socketId')
  async forceEndSession(
    @Param('socketId') socketId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const session = await this.sessionService.getSessionBySocket(socketId);
      
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const endedSession = await this.sessionService.endSession(socketId);
      
      return {
        success: true,
        data: {
          message: 'Session ended successfully',
          sessionId: socketId,
          endedBy: req.user.sub || req.user.id,
          endedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to end session: ${error.message}`);
    }
  }

  /**
   * Cleanup expired sessions manually (admin endpoint)
   */
  @Post('cleanup-expired')
  async cleanupExpiredSessions(@Request() req: AuthenticatedRequest) {
    try {
      // Trigger manual cleanup
      await this.sessionService.cleanupExpiredSessions();
      
      return {
        success: true,
        data: {
          message: 'Expired sessions cleanup completed',
          triggeredBy: req.user.sub || req.user.id,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to cleanup expired sessions: ${error.message}`);
    }
  }

  /**
   * Get comprehensive session analytics
   */
  @Get('analytics')
  async getSessionAnalytics(@Query('days') days?: number) {
    try {
      const daysPeriod = days && days > 0 ? Math.min(days, 90) : 7; // Default 7 days, max 90
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - daysPeriod * 24 * 60 * 60 * 1000);

      // You can extend this with more complex analytics
      const stats = await this.sessionService.getSessionStats();
      
      return {
        success: true,
        data: {
          period: {
            days: daysPeriod,
            startDate,
            endDate,
          },
          currentStats: stats,
          // Add more analytics here as needed
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get session analytics: ${error.message}`);
    }
  }
}