import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { SchoolClass, ClassCategory } from './schemas/class.schema';
import { User } from '../users/schemas/user.schema';
import { UserSubscription } from '../subscriptions/schemas/user-subscription.schema';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ClassesService', () => {
  let service: ClassesService;

  class MockClass {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ _id: 'class1', ...this }));
  }

  const mockClassModel = {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
    findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    countDocuments: jest.fn().mockResolvedValue(0),
    insertMany: jest.fn().mockResolvedValue([]),
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  };

  const mockUserSubscriptionModel = {
    findOne: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: getModelToken(SchoolClass.name), useValue: mockClassModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(UserSubscription.name), useValue: mockUserSubscriptionModel },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);

    // Mock constructor for new this.classModel
    (service as any).classModel = Object.assign(
      function (data: any) { return new MockClass(data); },
      mockClassModel
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active classes sorted by order', async () => {
      const mockClasses = [{ name: 'Primary 1' }, { name: 'JSS 1' }];
      mockClassModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockClasses) }),
      });

      const result = await service.findAll();
      expect(result).toEqual(mockClasses);
    });
  });

  describe('seedClasses', () => {
    it('should seed classes if none exist', async () => {
      mockClassModel.countDocuments.mockResolvedValueOnce(0);
      const res = await service.seedClasses();
      expect(res.count).toBe(12);
      expect(mockClassModel.insertMany).toHaveBeenCalled();
    });

    it('should skip seeding if classes already exist', async () => {
      mockClassModel.countDocuments.mockResolvedValueOnce(12);
      const res = await service.seedClasses();
      expect(res.count).toBe(12);
      expect(mockClassModel.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('selectClass', () => {
    it('should throw NotFoundException if class not found', async () => {
      mockClassModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.selectClass('user1', 'Unknown Class')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException with clear 1-year message if user has active paid subscription for different class', async () => {
      mockClassModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ name: 'Primary 1' }) });
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'user1', class: 'JSS 1' }) });
      mockUserSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            classLevel: 'JSS 1',
            package: { name: 'JSS 1 Learning Package' },
            isActive: true,
            status: 'active',
          }),
        }),
      });

      await expect(service.selectClass('user1', 'Primary 1')).rejects.toThrow(
        /locked to JSS 1 for this 1-year academic period/
      );
    });

    it('should allow student to change to another class after the 1-year subscription expires', async () => {
      // 1 year has passed, subscription is expired -> null returned from active query
      mockClassModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ name: 'JSS 2' }) });
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'user1', class: 'JSS 1' }) });
      mockUserSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'user1',
          class: 'JSS 2',
          firstName: 'Chioma',
          lastName: 'Adeyemi',
          email: 'chioma@example.com',
        }),
      });

      const result = await service.selectClass('user1', 'JSS 2');
      expect(result.selectedClass).toBe('JSS 2');
      expect(result.message).toContain('Class successfully set to JSS 2');
    });

    it('should update user class if no active conflicting subscription', async () => {
      mockClassModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ name: 'JSS 1' }) });
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'user1', class: null }) });
      mockUserSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'user1', class: 'JSS 1', firstName: 'A', lastName: 'B', email: 'a@b.com' }),
      });

      const result = await service.selectClass('user1', 'JSS 1');
      expect(result.selectedClass).toBe('JSS 1');
    });
  });

  describe('getUserClassStatus', () => {
    it('should return isClassLocked: true during active or grace subscription', async () => {
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'user1', class: 'JSS 1' }) });
      mockUserSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            classLevel: 'JSS 1',
            status: 'active',
            isActive: true,
          }),
        }),
      });

      const status = await service.getUserClassStatus('user1');
      expect(status.isClassLocked).toBe(true);
      expect(status.paidClass).toBe('JSS 1');
    });

    it('should return isClassLocked: false when subscription is expired', async () => {
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'user1', class: 'JSS 1' }) });
      mockUserSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const status = await service.getUserClassStatus('user1');
      expect(status.isClassLocked).toBe(false);
      expect(status.paidClass).toBeNull();
    });
  });
});
