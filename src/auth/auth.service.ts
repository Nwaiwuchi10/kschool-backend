import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../users/dto/user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create(createUserDto);
    
    // Fire and forget welcome email
    this.mailService.sendWelcomeEmail?.(user)?.catch?.(e => console.error('Email error', e));

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fire and forget login notification email
    this.mailService.sendLoginNotificationEmail?.(user, meta)?.catch?.(e => console.error('Login email error', e));

    return this.generateToken(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No account found with this email');
    }

    // Generate 4-digit numeric code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.usersService.setResetPasswordToken(dto.email, code, expires);
    this.mailService.sendPasswordResetCodeEmail?.(user, code)?.catch?.(e => console.error('Reset code email error', e));

    return {
      message: 'A 4-digit verification code has been sent to your email',
      email: dto.email,
    };
  }

  async verifyResetCode(dto: VerifyCodeDto) {
    const isValid = await this.usersService.verifyResetCode(dto.email, dto.code);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }
    return {
      valid: true,
      message: 'Verification code is valid',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.resetPasswordWithCode(dto.email, dto.code, dto.newPassword);
    this.mailService.sendPasswordChangedEmail?.(user)?.catch?.(e => console.error('Password changed email error', e));

    return {
      message: 'Password has been reset successfully. You can now log in.',
    };
  }

  private generateToken(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        class: user.class,
        school: user.school,
      }
    };
  }
}
