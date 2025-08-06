import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalesRepDto {
  @ApiProperty({
    description: 'The name of the sales representative',
    example: 'John Smith',
    type: String,
  })
  @IsString()
  name: string;
}
