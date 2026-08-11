import { Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: any) { return this.auth.me(user.id); }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.auth.uploadAvatar(user.id, file);
  }

  @Get('me/notification-prefs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getNotificationPrefs(@CurrentUser() user: any) {
    return this.auth.getNotificationPrefs(user.id);
  }

  @Patch('me/notification-prefs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateNotificationPrefs(@CurrentUser() user: any, @Body() dto: UpdateNotificationPrefsDto) {
    return this.auth.updateNotificationPrefs(user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteAccount(@CurrentUser() user: any, @Body() dto: DeleteAccountDto) {
    return this.auth.deleteAccount(user.id, dto);
  }
}
