import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ClassCategory } from '../schemas/class.schema';

export class CreateClassDto {
  @ApiProperty({ example: 'JSS 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'jss-1' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ClassCategory, example: ClassCategory.JUNIOR_SECONDARY })
  @IsEnum(ClassCategory)
  @IsOptional()
  category?: ClassCategory;

  @ApiProperty({ example: 7 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: 'Junior Secondary School Year 1', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
