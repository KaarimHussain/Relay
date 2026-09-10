import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateMcpAccessTokenDto } from './dto/create-mcp-access-token.dto';
import { McpAccessTokenService } from './mcp-access-token.service';

@ApiTags('MCP integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/mcp/tokens')
export class McpAccessTokenController {
  constructor(private accessTokens: McpAccessTokenService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.accessTokens.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateMcpAccessTokenDto) {
    return this.accessTokens.create(user.id, dto.name, dto.expiresAt);
  }

  @Delete(':tokenId')
  revoke(@CurrentUser() user: any, @Param('tokenId') tokenId: string) {
    return this.accessTokens.revoke(user.id, tokenId);
  }
}
