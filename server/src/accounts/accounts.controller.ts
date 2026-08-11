import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';
import { IsString } from 'class-validator';

class ConnectLinkedInPageDto {
  @IsString() pageIdentifier: string;
}

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/accounts')
export class AccountsController {
  constructor(private accounts: AccountsService) {}

  @Post()
  @Roles(MemberRole.Admin, MemberRole.Owner)
  connect(@Param('brandId') brandId: string, @Body() dto: ConnectAccountDto) {
    return this.accounts.connect(brandId, dto);
  }

  @Get()
  list(@Param('brandId') brandId: string) { return this.accounts.list(brandId); }

  @Delete(':accountId')
  @Roles(MemberRole.Admin, MemberRole.Owner)
  disconnect(@Param('brandId') brandId: string, @Param('accountId') accountId: string) {
    return this.accounts.disconnect(brandId, accountId);
  }

  @Get(':accountId/health')
  health(@Param('brandId') brandId: string, @Param('accountId') accountId: string) {
    return this.accounts.healthCheck(brandId, accountId);
  }

  @Post('linkedin-page')
  @Roles(MemberRole.Admin, MemberRole.Owner)
  connectLinkedInPage(@Param('brandId') brandId: string, @Body() dto: ConnectLinkedInPageDto) {
    return this.accounts.connectLinkedInPage(brandId, dto.pageIdentifier);
  }
}
