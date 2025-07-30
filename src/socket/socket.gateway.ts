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
import { ModuleRef } from '@nestjs/core';
import { SalesRepService } from 'src/sales-rep/sales-rep.service';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socket.id => salesRepId
  private salesRepService: SalesRepService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.salesRepService = this.moduleRef.get(SalesRepService, {
      strict: false,
    });
  }

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const salesRepId = this.connectedUsers.get(client.id);
    if (salesRepId) {
      console.log(`🔴 SalesRep disconnected: ${salesRepId}`);

      await this.salesRepService.setOffline(salesRepId);

      this.connectedUsers.delete(client.id);
    }

    console.log(`Client disconnected: ${client.id}`);
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

  @SubscribeMessage('user:online')
  async handleUserOnline(
    @MessageBody() data: { salesRepId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { salesRepId } = data;

    // Update status to online
    await this.salesRepService.setOnline(salesRepId);

    // Save user connection
    this.connectedUsers.set(client.id, salesRepId);

    console.log(`🟢 SalesRep is online: ${salesRepId}`);

    await this.salesRepService.sendReplayToUser(salesRepId, client);
  }
}
