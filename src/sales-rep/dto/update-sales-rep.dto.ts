import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateSalesRepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}
