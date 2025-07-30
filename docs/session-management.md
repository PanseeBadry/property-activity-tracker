# User Session & Online Status Management

This document provides a comprehensive overview of the User Session & Online Status Management system implemented for the property activity tracker.

## Overview

The session management system tracks user connections, manages online status, and provides real-time session analytics. It handles multiple concurrent sessions per user, automatic session cleanup, and seamless reconnection handling.

## Architecture Components

### 1. UserSession Schema (`src/schemas/user-session.schema.ts`)

The core data model for tracking user sessions:

```typescript
interface UserSession {
  salesRepId: string;           // Reference to SalesRep
  socketId: string;            // Unique socket identifier
  ipAddress: string;           // Client IP address
  userAgent: string;           // Client browser/app info
  status: SessionStatus;       // ACTIVE | INACTIVE | EXPIRED
  connectedAt: Date;           // Session start time
  disconnectedAt: Date | null; // Session end time
  lastActivity: Date | null;   // Last user activity
  lastHeartbeat: Date | null;  // Last heartbeat signal
  connectionLocation?: {       // Optional geo location
    lat: number;
    lng: number;
  };
  metadata: Map<string, string>; // Additional session data
  sessionDuration: number;     // Duration in milliseconds
}
```

**Key Features:**
- Unique socket ID indexing for fast lookups
- Geographic location tracking
- Session duration calculation
- Comprehensive metadata support
- Database indexes for optimal performance

### 2. SessionService (`src/session/session.service.ts`)

Core service managing all session operations:

#### Session Lifecycle Methods

```typescript
// Create new session when user connects
createSession(data: CreateSessionData): Promise<UserSession>

// End session when user disconnects  
endSession(socketId: string): Promise<UserSession | null>

// Update heartbeat to keep session alive
updateHeartbeat(socketId: string): Promise<boolean>

// Update activity timestamp
updateActivity(socketId: string, activityType?: string): Promise<boolean>
```

#### Session Query Methods

```typescript
// Get active sessions for a user
getActiveSessionsByUser(salesRepId: string): Promise<UserSession[]>

// Get session by socket ID
getSessionBySocket(socketId: string): Promise<UserSession | null>

// Get all online users
getOnlineUsers(): Promise<string[]>

// Check if user is online
isUserOnline(salesRepId: string): Promise<boolean>
```

#### Analytics Methods

```typescript
// Get comprehensive session statistics
getSessionStats(): Promise<SessionStats>

// Get user's session history
getUserSessionHistory(salesRepId: string, limit?: number): Promise<UserSession[]>
```

#### Automatic Cleanup

- **Expired Session Cleanup**: Runs every 5 minutes via `@Cron`
- **Old Session Cleanup**: Runs daily at 2 AM via `@Cron`
- **Configurable Timeouts**:
  - Session timeout: 30 minutes
  - Heartbeat timeout: 5 minutes

### 3. Enhanced SocketGateway (`src/socket/socket.gateway.ts`)

WebSocket gateway with comprehensive session integration:

#### Authentication Flow

```typescript
@SubscribeMessage('auth:login')
async handleAuthentication(data: { token: string; location?: { lat: number; lng: number } })
```

**Process:**
1. Verify JWT token
2. Validate user exists
3. Create session with location data
4. Mark client as authenticated
5. Broadcast user online status
6. Send replay of missed activities
7. Update session statistics

#### Session Events

```typescript
// User authentication
'auth:login' -> 'auth:success' | 'auth:error'

// User logout
'auth:logout' -> 'auth:logout-success'

// Session heartbeat
'session:heartbeat' -> 'session:heartbeat-ack'

// Activity tracking
'session:activity' -> (updates activity timestamp)

// Get online users
'users:get-online' -> 'users:online-list'

// Get session stats
'session:get-stats' -> 'session:stats'
```

#### Status Broadcasting

```typescript
// User status changes
broadcastUserStatusChange(salesRepId: string, isOnline: boolean)

// Session statistics updates
broadcastSessionStats()
```

### 4. SessionController (`src/session/session.controller.ts`)

REST API endpoints for session management:

#### Public Endpoints

```typescript
GET /sessions/stats                    // Session statistics
GET /sessions/online-users            // Currently online users
GET /sessions/my-sessions             // Current user's active sessions
GET /sessions/my-history              // Current user's session history
```

#### User-Specific Endpoints

```typescript
GET /sessions/user/:userId/online-status     // Check user online status
GET /sessions/user/:userId/history           // User session history (admin)
GET /sessions/user/:userId/active-sessions   // User active sessions (admin)
```

#### Admin Endpoints

```typescript
DELETE /sessions/session/:socketId     // Force end session
POST /sessions/cleanup-expired         // Manual cleanup trigger
GET /sessions/analytics               // Comprehensive analytics
```

### 5. SessionValidationMiddleware (`src/session/middleware/session-validation.middleware.ts`)

Express middleware for session validation:

**Features:**
- JWT token verification
- Active session validation
- Automatic activity tracking for API calls
- Session info injection into requests
- Configurable route skipping

**Request Enhancement:**
```typescript
interface AuthenticatedRequest extends Request {
  user?: { sub: string; id: string; };
  sessionInfo?: {
    isValid: boolean;
    sessionId?: string;
    lastActivity?: Date;
  };
}
```

## Session Lifecycle

### 1. User Connection

1. Client connects to WebSocket
2. SocketGateway extracts connection metadata
3. Client sends `auth:login` with JWT token
4. Gateway verifies token and creates session
5. User marked as online
6. Session statistics updated
7. Missed activities replayed

### 2. Active Session Management

1. **Heartbeat Monitoring**: Client sends periodic heartbeats
2. **Activity Tracking**: API calls and socket events update activity
3. **Multiple Sessions**: Users can have multiple concurrent sessions
4. **Real-time Updates**: Session changes broadcast to all users

### 3. User Disconnection

1. Socket disconnect event triggered
2. Session marked as inactive
3. Session duration calculated
4. User marked offline (if no other sessions)
5. Status change broadcast to other users

### 4. Automatic Cleanup

1. **Expired Sessions**: Sessions without heartbeat for 5+ minutes
2. **Stale Sessions**: Sessions without activity for 30+ minutes
3. **Old Records**: Sessions older than 30 days removed daily

## Configuration

### Environment Variables

```env
JWT_SECRET=your-jwt-secret
MONGODB_URI=mongodb://localhost:27017/property-tracker
```

### Timeout Configuration

```typescript
// In SessionService
private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
private readonly HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
```

## Usage Examples

### Frontend WebSocket Integration

```javascript
// Connect and authenticate
const socket = io('ws://localhost:3000');

socket.on('connection:established', (data) => {
  console.log('Connected:', data.socketId);
  
  // Authenticate with JWT
  socket.emit('auth:login', {
    token: localStorage.getItem('jwt_token'),
    location: { lat: 40.7128, lng: -74.0060 } // Optional
  });
});

socket.on('auth:success', (data) => {
  console.log('Authenticated:', data.user);
  
  // Start heartbeat
  setInterval(() => {
    socket.emit('session:heartbeat');
  }, 60000); // Every minute
});

socket.on('user:status-change', (data) => {
  console.log(`User ${data.salesRepId} is now ${data.isOnline ? 'online' : 'offline'}`);
});
```

### REST API Usage

```javascript
// Get session statistics
const stats = await fetch('/api/sessions/stats', {
  headers: { Authorization: `Bearer ${token}` }
});

// Get online users
const onlineUsers = await fetch('/api/sessions/online-users', {
  headers: { Authorization: `Bearer ${token}` }
});

// Get my session history
const history = await fetch('/api/sessions/my-history?limit=20', {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Database Indexes

The system includes optimized database indexes for performance:

```javascript
// UserSession collection indexes
{ salesRepId: 1, status: 1 }     // User sessions lookup
{ socketId: 1 }                  // Unique socket lookup
{ connectedAt: -1 }              // Session history queries
{ status: 1, lastHeartbeat: 1 }  // Cleanup queries
```

## Benefits

1. **Multi-Session Support**: Users can connect from multiple devices
2. **Automatic Cleanup**: Prevents memory leaks and stale data
3. **Real-time Updates**: Live session statistics and status changes
4. **Comprehensive Logging**: Detailed session analytics and history
5. **Geographic Tracking**: Optional location-based session data
6. **Scalable Architecture**: Optimized for high-concurrency scenarios
7. **Session Security**: JWT verification with active session validation
8. **Graceful Reconnection**: Seamless handling of network interruptions

## Monitoring and Analytics

### Session Statistics

```typescript
interface SessionStats {
  totalActiveSessions: number;      // Currently active sessions
  totalOnlineUsers: number;         // Unique online users
  averageSessionDuration: number;   // Average duration in ms
  sessionsToday: number;           // Sessions created today
}
```

### Session Analytics

- Session duration trends
- Peak usage times
- Geographic distribution
- Device/browser analytics
- User activity patterns

## Error Handling

The system includes comprehensive error handling:

- **Connection Errors**: Graceful disconnect handling
- **Authentication Failures**: Clear error messages
- **Database Errors**: Retry logic and fallbacks
- **Cleanup Failures**: Logged and monitored
- **Invalid Tokens**: Automatic session termination

## Security Considerations

1. **JWT Verification**: All sessions require valid JWT tokens
2. **IP Tracking**: Session IP addresses logged for security
3. **Session Timeouts**: Automatic cleanup of inactive sessions
4. **Rate Limiting**: (Recommended) Add rate limiting to prevent abuse
5. **CORS Configuration**: Proper WebSocket CORS settings
6. **User Agent Logging**: Track client applications for security

This comprehensive session management system provides a robust foundation for tracking user activity and maintaining real-time connectivity in the property activity tracker application.