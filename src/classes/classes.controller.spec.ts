import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

describe('ClassesController', () => {
  let controller: ClassesController;

  const mockClassesService = {
    findAll: jest.fn().mockResolvedValue([{ name: 'JSS 1' }]),
    findAllAdmin: jest.fn().mockResolvedValue([{ name: 'JSS 1' }]),
    findOne: jest.fn().mockResolvedValue({ name: 'JSS 1' }),
    create: jest.fn().mockResolvedValue({ name: 'JSS 1' }),
    update: jest.fn().mockResolvedValue({ name: 'JSS 1' }),
    remove: jest.fn().mockResolvedValue(undefined),
    seedClasses: jest.fn().mockResolvedValue({ count: 12 }),
    getUserClassStatus: jest.fn().mockResolvedValue({ selectedClass: 'JSS 1', isClassLocked: false }),
    selectClass: jest.fn().mockResolvedValue({ message: 'Success', selectedClass: 'JSS 1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: mockClassesService,
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all classes', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([{ name: 'JSS 1' }]);
    expect(mockClassesService.findAll).toHaveBeenCalled();
  });

  it('should get class status for user', async () => {
    const req = { user: { id: 'u1' } };
    const res = await controller.getMyClassStatus(req);
    expect(res.selectedClass).toBe('JSS 1');
    expect(mockClassesService.getUserClassStatus).toHaveBeenCalledWith('u1');
  });

  it('should select class for user', async () => {
    const req = { user: { id: 'u1' } };
    const res = await controller.selectClass(req, { className: 'JSS 1' });
    expect(res.selectedClass).toBe('JSS 1');
    expect(mockClassesService.selectClass).toHaveBeenCalledWith('u1', 'JSS 1');
  });
});
