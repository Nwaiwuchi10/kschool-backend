import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockSubscriptionsService = {
    findPackageById: jest.fn().mockResolvedValue({
      _id: 'pkg1',
      name: 'JSS 1 Learning Package',
      academicSession: '2026/2027',
      price: 25000,
    }),
    findAllPackages: jest.fn().mockResolvedValue([
      { _id: 'pkg1', name: 'JSS 1 Learning Package', price: 25000 },
    ]),
    activateSubscription: jest.fn().mockResolvedValue({
      _id: 'sub1',
      reference: 'ref1',
      amountPaid: 25000,
      isActive: true,
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'MONNIFY_API_KEY') return 'MK_TEST_1K6HNBT4B0';
      if (key === 'MONNIFY_SECRET_KEY') return 'RAU88A8TFS1MJFC89GGSF88LR9Y9F45S';
      if (key === 'MONNIFY_BASE_URL') return 'https://sandbox.monnify.com';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializePayment', () => {
    it('should initialize a Monnify payment with reference and checkout url', async () => {
      jest.spyOn(service, 'getMonnifyAccessToken').mockResolvedValue('mock-bearer-token');
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              requestSuccessful: true,
              responseBody: {
                transactionReference: 'MNFY|mock|123',
                paymentReference: 'KSM-mock-ref',
                checkoutUrl: 'https://sandbox.monnify.com/checkout/123',
              },
            }),
        } as any)
      );

      const user = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const result = await service.initializePayment(user, 'pkg1');
      expect(result.success).toBe(true);
      expect(result.paymentReference).toMatch(/^KSM-/);
      expect(result.amount).toBe(25000);
      expect(result.checkoutUrl).toBeDefined();
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment and activate 1-year subscription', async () => {
      const result = await service.verifyPayment('ref1', 'user1', 'pkg1');
      expect(result.success).toBe(true);
      expect(mockSubscriptionsService.activateSubscription).toHaveBeenCalledWith(
        'user1',
        'pkg1',
        'ref1',
        25000,
        'monnify',
      );
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook event gracefully', async () => {
      const body = { eventData: { paymentReference: 'ref1', paymentStatus: 'PAID', amountPaid: 25000 } };
      const result = await service.handleWebhook(body, '');
      expect(result.status).toBe('success');
    });
  });
});
