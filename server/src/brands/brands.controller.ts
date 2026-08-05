import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';

@ApiTags('Brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private brands: BrandsService) {}

  @Post() create(@CurrentUser() user: any, @Body() dto: CreateBrandDto) {
    return this.brands.create(user.id, dto);
  }

  @Get() list(@CurrentUser() user: any) {
    return this.brands.listForUser(user.id);
  }

  @Get(':brandId')
  @UseGuards(BrandMemberGuard)
  findOne(@Param('brandId') brandId: string) { return this.brands.findOne(brandId); }

  @Patch(':brandId')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  update(@Param('brandId') brandId: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(brandId, dto);
  }

  @Delete(':brandId')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Owner)
  delete(@Param('brandId') brandId: string) { return this.brands.delete(brandId); }

  @Post(':brandId/members')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  invite(@Param('brandId') brandId: string, @Body() dto: InviteMemberDto) {
    return this.brands.inviteMember(brandId, dto);
  }

  @Delete(':brandId/members/:userId')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  removeMember(
    @Param('brandId') brandId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) { return this.brands.removeMember(brandId, userId, user.id); }

  @Get(':brandId/members')
  @UseGuards(BrandMemberGuard)
  listMembers(@Param('brandId') brandId: string) { return this.brands.listMembers(brandId); }
}
