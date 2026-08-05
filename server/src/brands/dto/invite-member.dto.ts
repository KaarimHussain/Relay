import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: MemberRole }) @IsEnum(MemberRole) role: MemberRole;
}
