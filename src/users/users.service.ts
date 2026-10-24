import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailService: MailService,
  ) {}

  async create(createUserDto: any): Promise<User> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      createUserDto.password = await bcrypt.hash(createUserDto.password, salt);
    }

    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();

    // Send email notification based on role
    try {
      if (savedUser.role === UserRole.TEACHER || savedUser.role === ('teacher' as any)) {
        await this.mailService.sendTeacherInviteEmail(savedUser, {
          assignedClass: savedUser.class,
          subject: savedUser.subject,
        });
      } else {
        await this.mailService.sendWelcomeEmail(savedUser);
      }
    } catch (mailErr) {
      this.logger.error(`Error sending email to ${savedUser.email}:`, mailErr);
    }

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: any): Promise<User> {
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async setResetPasswordToken(email: string, token: string, expires: Date): Promise<UserDocument> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No user found with this email address');
    }

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    return user.save();
  }

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No user found with this email address');
    }

    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return false;
    }

    return true;
  }

  async resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<UserDocument> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No user found with this email address');
    }

    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new ConflictException('Invalid or expired verification code');
    }

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    return user.save();
  }
}
