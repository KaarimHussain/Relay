import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

const DEFAULT_NOTIFICATION_PREFS = {
  postPublished: true,
  postFailed: true,
  weeklyDigest: true,
  newFollowers: false,
  aiSuggestions: true,
  billingAlerts: true,
  productUpdates: false,
};

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    const token = this.sign(user.id);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token: this.sign(user.id) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('Email already in use');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...(dto.name && { name: dto.name }), ...(dto.email && { email: dto.email }), ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }) },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Password updated' };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('File must be an image');

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'relay/avatars',
          unique_filename: true,
          transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
        },
        (err, result) => {
          if (err || !result) reject(err ?? new Error('Cloudinary upload failed'));
          else resolve(result);
        },
      ).end(file.buffer);
    }).catch(() => {
      throw new BadRequestException('Failed to upload image — please try again');
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return the same response to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    // Invalidate any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host:   this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port:   Number(this.config.get('SMTP_PORT', '587')),
      secure: this.config.get('SMTP_PORT') === '465',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from:    this.config.get('SMTP_FROM', `"Relay" <noreply@relay.app>`),
      to:      user.email,
      subject: 'Reset your Relay password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
          <p style="font-size:20px;font-weight:700;margin:0 0 8px">Reset your password</p>
          <p style="font-size:14px;color:#555;margin:0 0 24px">
            Hi ${user.name}, click the button below to set a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">
            Reset password
          </a>
          <p style="font-size:12px;color:#999;margin:24px 0 0">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.deleteMany({ where: { token: dto.token } });
      throw new BadRequestException('Reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.delete({ where: { id: record.id } });

    return { message: 'Password updated successfully. You can now sign in.' };
  }

  async getNotificationPrefs(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs as object ?? {}) };
  }

  async updateNotificationPrefs(userId: string, dto: UpdateNotificationPrefsDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notificationPrefs as object ?? {}), ...dto };
    await this.prisma.user.update({ where: { id: userId }, data: { notificationPrefs: merged } });
    return merged;
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new BadRequestException('Password is incorrect');

    await this.prisma.$transaction(async (tx) => {
      // Posts don't cascade-delete from the author side — clear them first.
      await tx.post.deleteMany({ where: { authorId: userId } });

      // Fully remove brands this user solely owns (cascades accounts/media/posts/memberships).
      const memberships = await tx.membership.findMany({ where: { userId }, select: { brandId: true } });
      for (const { brandId } of memberships) {
        const otherMembers = await tx.membership.count({ where: { brandId, NOT: { userId } } });
        if (otherMembers === 0) {
          await tx.brand.delete({ where: { id: brandId } });
        }
      }

      // Deleting the user cascades any remaining memberships on shared brands.
      await tx.user.delete({ where: { id: userId } });
    });

    return { message: 'Account deleted' };
  }

  private sign(userId: string) {
    return this.jwt.sign({ sub: userId });
  }
}
