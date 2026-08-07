import { Body, Controller, Get, Param, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
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
  ) {
    const redirectUrl = await this.oauth.handleCallback(platform, code, state);
    return { url: redirectUrl, statusCode: 302 };
  }
}
