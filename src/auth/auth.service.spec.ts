import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mockJwtToken'),
  };

  const mockMailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendLoginNotificationEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user exists', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce({ id: '1' });
      const dto = { firstName: 'T', lastName: 'U', email: 'test@test.com', password: 'pwd' };
      
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create a user, send email, and return token', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce({ _id: '1', email: 'test@test.com' });
      
      const dto = { firstName: 'T', lastName: 'U', email: 'test@test.com', password: 'pwd' };
      const result = await service.register(dto);
      
      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalled();
      expect(result.access_token).toBe('mockJwtToken');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      await expect(service.login({ email: 'none@none.com', password: 'pwd' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce({ password: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      
      await expect(service.login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate registered student, return JWT token and role, and send notification email', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce({
        _id: '1',
        email: 'student@kschoolmate.com',
        firstName: 'Chioma',
        lastName: 'Adeyemi',
        role: 'student',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login({ email: 'student@kschoolmate.com', password: 'pwd' });
      expect(result.access_token).toBe('mockJwtToken');
      expect(result.user.email).toBe('student@kschoolmate.com');
      expect(result.user.role).toBe('student');
      expect(mockMailService.sendLoginNotificationEmail).toHaveBeenCalled();
    });
  });
});
