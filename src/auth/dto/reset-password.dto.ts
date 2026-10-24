import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '5284' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword: string;
}
