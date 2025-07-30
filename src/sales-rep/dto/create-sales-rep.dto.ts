import { IsString } from 'class-validator';

export class CreateSalesRepDto {
  @IsString()
  name: string;
}
