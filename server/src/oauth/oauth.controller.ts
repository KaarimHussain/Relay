import { BadRequestException, Body, Controller, Get, Param, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(private oauth: OAuthService) {}

  /**
   * JWT-protected: frontend calls this to get the redirect URL for a given platform.
   * Body: { brandId: string }
   * Returns: { url: string }
   */
  @Post('connect/:platform')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async connect(
    @Param('platform') platform: string,
    @Body() body: { brandId: string },
    @Req() req: any,
  ) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const url = this.oauth.buildConnectUrl(platform, userId, body.brandId);
    return { url };
  }

  @Get('linkedin/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  linkedinPending(@Query('tempId') tempId: string) {
    if (!tempId) throw new BadRequestException('tempId is required');
    return this.oauth.getLinkedInPending(tempId);
  }

  @Post('linkedin/finalize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async linkedinFinalize(@Body() body: { tempId: string; selections: string[] }) {
    if (!body.tempId || !Array.isArray(body.selections) || body.selections.length === 0) {
      throw new BadRequestException('tempId and at least one selection are required');
    }
    await this.oauth.finalizeLinkedIn(body.tempId, body.selections);
    return { message: 'LinkedIn accounts connected' };
  }

  /**
   * Public callback — platform redirects here after user authorizes.
   * Exchanges code, saves account, then redirects browser to frontend.
   */
  @Get('callback/:platform')
  @Redirect()
  async callback(
    @Param('platform') platform: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
  ) {
    if (error || !code) {
      const msg = encodeURIComponent(errorDescription ?? error ?? 'Authorization was denied or cancelled');
      const frontendUrl = this.oauth.getFrontendUrl();
      return { url: `${frontendUrl}/accounts?error=${msg}`, statusCode: 302 };
    }
    const redirectUrl = await this.oauth.handleCallback(platform, code, state);
    return { url: redirectUrl, statusCode: 302 };
  }
}
