import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call sendWelcomeEmail', async () => {
    await service.sendWelcomeEmail({ email: 'test@example.com', firstName: 'Test' });
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Welcome to KSCHOOLMATE! 🎉',
      }),
    );
  });

  it('should call sendPasswordResetEmail', async () => {
    await service.sendPasswordResetEmail({ email: 'test@example.com' }, 'token-123');
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Reset your KSCHOOLMATE password',
      }),
    );
  });
});
