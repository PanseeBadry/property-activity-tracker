import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SalesRepModule } from 'src/sales-rep/sales-rep.module';

@Module({
  imports: [forwardRef(() => SalesRepModule)],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
