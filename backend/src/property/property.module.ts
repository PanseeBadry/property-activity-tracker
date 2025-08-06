import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertySeederService } from './property-seeder.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from 'src/schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
  ],
  controllers: [PropertyController],
  providers: [PropertyService, PropertySeederService],
  exports: [PropertyService, PropertySeederService, MongooseModule],
})
export class PropertyModule {}
