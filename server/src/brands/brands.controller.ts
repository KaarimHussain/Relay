import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

  @Get(':brandId/agent-memory')
  @UseGuards(BrandMemberGuard)
  getAgentMemory(@Param('brandId') brandId: string) {
    return this.brands.getAgentMemory(brandId);
  }

  @Patch(':brandId/agent-memory')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  updateAgentMemory(@Param('brandId') brandId: string, @Body() dto: Record<string, unknown>) {
    return this.brands.updateAgentMemory(brandId, dto);
  }

  @Patch(':brandId')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  update(@Param('brandId') brandId: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(brandId, dto);
  }

  @Post(':brandId/logo')
  @UseGuards(BrandMemberGuard)
  @Roles(MemberRole.Admin, MemberRole.Owner)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(
    @Param('brandId') brandId: string,
    @UploadedFile() file: Express.Multer.File,
  ) { return this.brands.uploadLogo(brandId, file); }

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
