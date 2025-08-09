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

  private repConnections = new Map<string, Set<string>>();
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
    let disconnectedRepId: string | null = null;

    // Find which rep had this socket
    for (const [repId, sockets] of this.repConnections.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        disconnectedRepId = repId;

        // If no more sockets remain for this rep, wait a bit before marking offline
        if (sockets.size === 0) {
          this.repConnections.delete(repId);

          setTimeout(async () => {
            if (!this.repConnections.has(repId)) {
              await this.salesRepService.setOffline(repId);
              console.log(`SalesRep is now offline: ${repId}`);
            }
          }, 5000);
        }

        break;
      }
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

    // Send missed activities before marking online
    await this.salesRepService.sendReplayToUser(salesRepId, client);
    await this.salesRepService.setOnline(salesRepId);

    // Track this socket for the sales rep
    if (!this.repConnections.has(salesRepId)) {
      this.repConnections.set(salesRepId, new Set());
    }

    this.repConnections.get(salesRepId)?.add(client.id);
    // console.log('repConnections', this.repConnections);

    console.log(`SalesRep is online: ${salesRepId} (${client.id})`);
  }
}
