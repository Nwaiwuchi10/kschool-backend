import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  constructor(@Optional() @Inject('CLOUDINARY') private readonly cloudinaryConfig?: any) {}

  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'kschoolmate' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      toStream(file.buffer).pipe(upload);
    });
  }

  async uploadAudioBuffer(buffer: Buffer, filename: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'kschoolmate/audio',
          resource_type: 'video', // Cloudinary stores audio under video resource_type
          public_id: filename,
          format: 'mp3',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      toStream(buffer).pipe(upload);
    });
  }

  async deleteFile(publicId: string) {
    if (!publicId) {
      throw new BadRequestException('No publicId provided');
    }
    return cloudinary.uploader.destroy(publicId);
  }
}
