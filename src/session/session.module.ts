import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { UserSession, UserSessionSchema } from '../schemas/user-session.schema';
import { SalesRep, SalesRepSchema } from '../schemas/sales-rep.schema';
import { SalesRepModule } from '../sales-rep/sales-rep.module';
import { Activity, ActivitySchema } from '../schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
      { name: SalesRep.name, schema: SalesRepSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    ScheduleModule.forRoot(), // Enable cron jobs for session cleanup
    forwardRef(() => SalesRepModule), // Avoid circular dependencies
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService], // Export for use in other modules
})
export class SessionModule {}