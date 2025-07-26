import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ModuleRef } from '@nestjs/core';
import { SalesRepService } from 'src/sales-rep/sales-rep.service';

@WebSocketGateway({ cors: true })
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  private salesRepService: SalesRepService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.salesRepService = this.moduleRef.get(SalesRepService, {
      strict: false,
    });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
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
    await this.salesRepService.sendReplayToUser(data.salesRepId, client);
  }
}
