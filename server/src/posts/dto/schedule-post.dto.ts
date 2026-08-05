import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SchedulePostDto {
  @ApiProperty() @IsDateString() scheduledAt: string;
}
