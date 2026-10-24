import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectClassDto {
  @ApiProperty({ example: 'JSS 1' })
  @IsString()
  @IsNotEmpty()
  className: string;
}
