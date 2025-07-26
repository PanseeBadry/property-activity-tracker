import { forwardRef, Module } from '@nestjs/common';
import { SalesRepController } from './sales-rep.controller';
import { SalesRepService } from './sales-rep.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesRep, SalesRepSchema } from 'src/schemas/sales-rep.schema';
import { SocketModule } from 'src/socket/socket.module';
import { Activity, ActivitySchema } from 'src/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesRep.name, schema: SalesRepSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    forwardRef(() => SocketModule),
  ],
  controllers: [SalesRepController],
  providers: [SalesRepService],
  exports: [SalesRepService],
})
export class SalesRepModule {}
