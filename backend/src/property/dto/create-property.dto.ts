import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({
    description: 'Latitude coordinate of the property',
    example: 40.7128,
    type: Number,
  })
  @IsNumber()
  lat: number;

  @ApiProperty({
    description: 'Longitude coordinate of the property',
    example: -74.006,
    type: Number,
  })
  @IsNumber()
  lng: number;
}

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Name of the property',
    example: 'Sunset Villa',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  propertyName: string;

  @ApiProperty({
    description: 'Full address of the property',
    example: '123 Main Street, New York, NY 10001',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Geographic coordinates of the property',
    type: LocationDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
