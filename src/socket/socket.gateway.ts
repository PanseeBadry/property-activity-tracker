import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../session/session.service';
import { SalesRepService } from 'src/sales-rep/sales-rep.service';

interface AuthenticatedSocket extends Socket {
  salesRepId?: string;
  isAuthenticated?: boolean;
}

@WebSocketGateway({ 
  cors: true,
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private sessionService: SessionService,
    private salesRepService: SalesRepService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client attempting connection: ${client.id}`);
      
      // Extract IP address and user agent
      const ipAddress = client.handshake.address || client.conn.remoteAddress || 'unknown';
      const userAgent = client.handshake.headers['user-agent'] || 'unknown';

      // Store connection info for later use
      client.data = {
        ipAddress,
        userAgent,
        connectedAt: new Date(),
      };

      this.logger.log(`Client connected: ${client.id} from ${ipAddress}`);
      
      // Emit connection established event
      client.emit('connection:established', {
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client disconnecting: ${client.id}`);

      if (client.isAuthenticated && client.salesRepId) {
        // End the session
        await this.sessionService.endSession(client.id);
        
        // Broadcast user offline status to other users
        this.broadcastUserStatusChange(client.salesRepId, false);
        
        this.logger.log(`User ${client.salesRepId} session ended for socket ${client.id}`);
      }

    } catch (error) {
      this.logger.error(`Error handling disconnection: ${error.message}`, error.stack);
    }
  }

  broadcastNewActivity(activity: any) {
    this.server.emit('activity:new', activity);
  }

  broadcastNotification(message: string) {
    this.server.emit('notification', message);
  }

  sendReplayActivities(socket: Socket, activities: any[]) {
    socket.emit('activity:replay', activities);
  }

  broadcastUserStatusChange(salesRepId: string, isOnline: boolean) {
    this.server.emit('user:status-change', {
      salesRepId,
      isOnline,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastSessionStats() {
    this.sessionService.getSessionStats().then(stats => {
      this.server.emit('session:stats', stats);
    });
  }

  /**
   * Authenticate user and create session
   */
  @SubscribeMessage('auth:login')
  async handleAuthentication(
    @MessageBody() data: { token: string; location?: { lat: number; lng: number } },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.logger.log(`Authentication attempt for socket ${client.id}`);

      if (!data.token) {
        client.emit('auth:error', { message: 'Token is required' });
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(data.token);
      const salesRepId = payload.sub || payload.id;

      if (!salesRepId) {
        client.emit('auth:error', { message: 'Invalid token payload' });
        return;
      }

      // Check if user exists
      const user = await this.salesRepService.findById(salesRepId);
      if (!user) {
        client.emit('auth:error', { message: 'User not found' });
        return;
      }

      // Create session
      await this.sessionService.createSession({
        salesRepId,
        socketId: client.id,
        ipAddress: client.data.ipAddress,
        userAgent: client.data.userAgent,
        connectionLocation: data.location,
      });

      // Mark client as authenticated
      client.isAuthenticated = true;
      client.salesRepId = salesRepId;

      // Send authentication success
      client.emit('auth:success', {
        user: {
          id: user._id,
          name: user.name,
          score: user.score,
        },
        sessionId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Broadcast user online status
      this.broadcastUserStatusChange(salesRepId, true);

      // Send replay of missed activities
      await this.salesRepService.sendReplayToUser(salesRepId, client);

      // Broadcast updated session stats
      this.broadcastSessionStats();

      this.logger.log(`User ${salesRepId} authenticated successfully on socket ${client.id}`);

    } catch (error) {
      this.logger.error(`Authentication failed for socket ${client.id}: ${error.message}`);
      client.emit('auth:error', { message: 'Authentication failed' });
    }
  }

  /**
   * Handle user going offline (logout)
   */
  @SubscribeMessage('auth:logout')
  async handleLogout(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.isAuthenticated && client.salesRepId) {
        await this.sessionService.endSession(client.id);
        this.broadcastUserStatusChange(client.salesRepId, false);
        
        client.emit('auth:logout-success', {
          message: 'Logged out successfully',
          timestamp: new Date().toISOString(),
        });

        // Reset client state
        client.isAuthenticated = false;
        delete client.salesRepId;

        this.broadcastSessionStats();
        this.logger.log(`User logged out from socket ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Logout failed for socket ${client.id}: ${error.message}`);
    }
  }

  /**
   * Handle heartbeat to keep session alive
   */
  @SubscribeMessage('session:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.isAuthenticated) {
        const updated = await this.sessionService.updateHeartbeat(client.id);
        
        client.emit('session:heartbeat-ack', {
          success: updated,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Heartbeat failed for socket ${client.id}: ${error.message}`);
    }
  }

  /**
   * Update user activity
   */
  @SubscribeMessage('session:activity')
  async handleActivity(
    @MessageBody() data: { activityType?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (client.isAuthenticated) {
        await this.sessionService.updateActivity(client.id, data.activityType);
      }
    } catch (error) {
      this.logger.error(`Activity update failed for socket ${client.id}: ${error.message}`);
    }
  }

  /**
   * Get online users
   */
  @SubscribeMessage('users:get-online')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.isAuthenticated) {
        const onlineUsers = await this.sessionService.getOnlineUsers();
        client.emit('users:online-list', {
          users: onlineUsers,
          count: onlineUsers.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Get online users failed for socket ${client.id}: ${error.message}`);
    }
  }

  /**
   * Get session statistics
   */
  @SubscribeMessage('session:get-stats')
  async handleGetSessionStats(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.isAuthenticated) {
        const stats = await this.sessionService.getSessionStats();
        client.emit('session:stats', stats);
      }
    } catch (error) {
      this.logger.error(`Get session stats failed for socket ${client.id}: ${error.message}`);
    }
  }

  /**
   * Legacy support for existing user:online event
   */
  @SubscribeMessage('user:online')
  async handleUserOnline(
    @MessageBody() data: { salesRepId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // This is now handled by auth:login, but keeping for backward compatibility
    this.logger.warn('user:online event is deprecated, use auth:login instead');
    
    if (data.salesRepId && client.isAuthenticated && client.salesRepId === data.salesRepId) {
      await this.salesRepService.sendReplayToUser(data.salesRepId, client);
    }
  }
}
