import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketGateway } from './socket.gateway';
import { SessionModule } from '../session/session.module';
import { SalesRepModule } from 'src/sales-rep/sales-rep.module';

@Module({
  imports: [
    SessionModule,
    forwardRef(() => SalesRepModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
