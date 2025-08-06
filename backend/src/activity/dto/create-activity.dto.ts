import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 40.7128,
    type: Number,
  })
  @IsNumber()
  lat: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -74.006,
    type: Number,
  })
  @IsNumber()
  lng: number;
}

export class CreateActivityDto {
  @ApiProperty({
    description: 'Unique identifier of the property',
    example: 'property-uuid-string',
    type: String,
  })
  @IsString()
  propertyId: string;

  @ApiProperty({
    description: 'Type of activity performed',
    enum: ['visit', 'call', 'inspection', 'follow-up', 'note'],
    example: 'visit',
  })
  @IsEnum(['visit', 'call', 'inspection', 'follow-up', 'note'])
  activityType: 'visit' | 'call' | 'inspection' | 'follow-up' | 'note';

  @ApiProperty({
    description: 'Timestamp when the activity occurred',
    example: '2024-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({
    description: 'Location coordinates where the activity took place',
    type: LocationDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: {
    lat: number;
    lng: number;
  };

  @ApiProperty({
    description: 'Optional note or comment about the activity',
    example: 'Met with client, showed property features',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
