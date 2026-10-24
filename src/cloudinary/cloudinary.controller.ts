import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Max file size: 100MB for media/audio files, 10MB for free tier images
const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB max limit

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a single file or audio voice note to Cloudinary (Max 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'kschoolmate/lessons',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const targetFolder = folder?.trim() || 'kschoolmate/media';
    const result = await this.cloudinaryService.uploadFile(file, targetFolder);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: (result as any).format,
      bytes: (result as any).bytes,
      resource_type: (result as any).resource_type,
    };
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple images or files to Cloudinary (Max 10MB each, up to 10 files)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
  }))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be provided');
    }
    const targetFolder = folder?.trim() || 'kschoolmate/lessons';
    const uploadPromises = files.map(async (file) => {
      const res = await this.cloudinaryService.uploadFile(file, targetFolder);
      return {
        url: res.secure_url,
        public_id: res.public_id,
        format: (res as any).format,
        bytes: (res as any).bytes,
        resource_type: (res as any).resource_type,
      };
    });
    const results = await Promise.all(uploadPromises);
    return { files: results, count: results.length };
  }
}
