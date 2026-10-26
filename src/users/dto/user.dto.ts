import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({ example: 'Adewale' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Johnson' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'adewale@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '+2348123456789', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../image.jpg', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: 'SS2 - Science', required: false })
  @IsString()
  @IsOptional()
  class?: string;

  @ApiProperty({ example: 'St Jude Catholic School Naze', required: false })
  @IsString()
  @IsOptional()
  school?: string;

  @ApiProperty({ example: 'Mathematics', required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: ['JSS 1', 'JSS 2'], type: [String], required: false })
  @IsOptional()
  classes?: string[];

  @ApiProperty({ example: ['Mathematics', 'English Language'], type: [String], required: false })
  @IsOptional()
  subjects?: string[];

  @ApiProperty({ example: ['lessons', 'exercises', 'quizzes'], type: [String], required: false })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ example: UserRole.STUDENT, enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
