import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryController } from './cloudinary.controller';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryController', () => {
  let controller: CloudinaryController;

  const mockCloudinaryService = {
    uploadFile: jest.fn().mockResolvedValue({ secure_url: 'http://test.com/img.png', public_id: 'test_id' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CloudinaryController],
      providers: [
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<CloudinaryController>(CloudinaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should upload file and return url', async () => {
    const file = { buffer: Buffer.from('test') } as Express.Multer.File;
    const result = await controller.uploadFile(file);
    expect(result).toEqual({ url: 'http://test.com/img.png', public_id: 'test_id' });
    expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(file);
  });
});
