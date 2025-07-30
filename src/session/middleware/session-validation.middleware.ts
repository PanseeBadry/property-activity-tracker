import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../session.service';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    id: string;
    [key: string]: any;
  };
  sessionInfo?: {
    isValid: boolean;
    sessionId?: string;
    lastActivity?: Date;
  };
}

@Injectable()
export class SessionValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionValidationMiddleware.name);

  constructor(
    private sessionService: SessionService,
    private jwtService: JwtService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Skip session validation for certain routes
      if (this.shouldSkipValidation(req.path)) {
        return next();
      }

      // Extract JWT token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.sessionInfo = { isValid: false };
        return next();
      }

      const token = authHeader.substring(7);
      
      try {
        // Verify JWT token
        const payload = this.jwtService.verify(token);
        const userId = payload.sub || payload.id;
        
        if (!userId) {
          req.sessionInfo = { isValid: false };
          return next();
        }

        // Check if user has active sessions
        const activeSessions = await this.sessionService.getActiveSessionsByUser(userId);
        
        if (activeSessions.length === 0) {
          // User has no active sessions but valid JWT
          this.logger.warn(`User ${userId} has valid JWT but no active sessions`);
          req.sessionInfo = { 
            isValid: false,
            lastActivity: null,
          };
          return next();
        }

        // Find the most recent session for activity tracking
        const mostRecentSession = activeSessions.reduce((latest, current) => 
          (!latest || current.lastActivity > latest.lastActivity) ? current : latest
        );

        // Set request user and session info
        req.user = payload;
        req.sessionInfo = {
          isValid: true,
          sessionId: mostRecentSession.socketId,
          lastActivity: mostRecentSession.lastActivity,
        };

        // Update activity for the most recent session if it's an API call
        if (req.method !== 'GET' && mostRecentSession) {
          await this.sessionService.updateActivity(
            mostRecentSession.socketId, 
            `API_${req.method}_${req.path}`
          );
        }

      } catch (jwtError) {
        this.logger.warn(`JWT verification failed: ${jwtError.message}`);
        req.sessionInfo = { isValid: false };
      }

    } catch (error) {
      this.logger.error(`Session validation error: ${error.message}`, error.stack);
      req.sessionInfo = { isValid: false };
    }

    next();
  }

  private shouldSkipValidation(path: string): boolean {
    const skipPaths = [
      '/health',
      '/favicon.ico',
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/docs',
      '/swagger',
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }
}