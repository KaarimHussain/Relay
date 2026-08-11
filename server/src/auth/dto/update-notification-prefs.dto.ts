import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() postPublished?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() postFailed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() weeklyDigest?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() newFollowers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aiSuggestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() billingAlerts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() productUpdates?: boolean;
}
