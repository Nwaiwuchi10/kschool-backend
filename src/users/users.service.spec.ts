import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    // For `new this.userModel(dto)` we need a constructor mock
  };

  class MockUser {
    constructor(data: any) { Object.assign(this, data); }
    save = jest.fn().mockImplementation(async () => ({ id: 'someId', ...this }));
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Override the model injection to also act as a constructor for 'new'
    (service as any).userModel = Object.assign(
      function(data: any) { return new MockUser(data); },
      mockUserModel
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const dto = { firstName: 'Adewale', lastName: 'Johnson', email: 'test@example.com' };
      mockUserModel.findOne.mockResolvedValueOnce(null);

      const result = await service.create(dto);
      expect(result.firstName).toBe('Adewale');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: dto.email });
    });

    it('should throw ConflictException if user exists', async () => {
      const dto = { firstName: 'A', lastName: 'B', email: 'test@example.com' };
      mockUserModel.findOne.mockResolvedValueOnce(true);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const mockUser = { firstName: 'Adewale' };
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) });

      const result = await service.findOne('id');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });
  });
});
