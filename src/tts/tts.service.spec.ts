import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { TtsService, SUPPORTED_TTS_VOICES } from './tts.service';
import { Lesson } from '../subjects/schemas/lesson.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotFoundException } from '@nestjs/common';

describe('TtsService', () => {
  let service: TtsService;
  let cloudinaryService: CloudinaryService;

  const mockLesson = {
    _id: 'lesson_math_1',
    title: 'Counting in Base Two (Binary Numbers)',
    content: '1101₂ = (1 × 2³) + (1 × 2²) + (0 × 2¹) + (1 × 2⁰) = 13₁₀\nBinary addition: 1 + 1 = 10₂\nFormula: \\frac{a}{b} and \\sqrt{x}',
    topic: 'topic_math_bases',
    duration: '12 mins',
    order: 2,
    status: 'published',
    audioUrl: 'https://res.cloudinary.com/kbgidkub/video/upload/sample.mp3',
    audioDuration: 360,
    audioStatus: 'ready',
    audioVoice: 'en-US-Neural2-F',
    audioVersion: 1,
    contentHash: 'abc123mockhash',
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
  };

  const createQueryMock = (returnValue: any) => ({
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(returnValue),
  });

  const mockLessonModel = {
    findById: jest.fn().mockImplementation(() => createQueryMock(mockLesson)),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        CLOUDINARY_NAME: 'kbgidkub',
        CLOUDINARY_API_KEY: '417842936417676',
        CLOUDINARY_API_SECRET: 'mock_secret',
      };
      return config[key] || null;
    }),
  };

  const mockCloudinaryService = {
    uploadAudioBuffer: jest.fn().mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/kbgidkub/video/upload/v1/audio/generated.mp3',
      duration: 480,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TtsService,
        { provide: getModelToken(Lesson.name), useValue: mockLessonModel },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<TtsService>(TtsService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSupportedVoices', () => {
    it('should return available neural and journey voices', () => {
      const voices = service.getSupportedVoices();
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.some((v) => v.id.includes('Neural2'))).toBe(true);
      expect(voices.some((v) => v.id.includes('Journey'))).toBe(true);
    });
  });

  describe('cleanTextForSpeech (LaTeX KaTeX & Scientific Formula typesetter)', () => {
    it('should convert LaTeX fraction \\frac{a}{b} to "a over b"', () => {
      const text = 'Calculate \\frac{1}{2} + \\frac{3}{4}';
      const clean = service.cleanTextForSpeech(text);
      expect(clean).toContain('1 over 2');
      expect(clean).toContain('3 over 4');
    });

    it('should convert square roots \\sqrt{x} to "square root of x"', () => {
      const text = 'Find \\sqrt{16}';
      const clean = service.cleanTextForSpeech(text);
      expect(clean).toContain('square root of 16');
    });

    it('should convert superscripts x^2 and x^3 to "squared" and "cubed"', () => {
      const text = 'Formula: x^2 + y^3';
      const clean = service.cleanTextForSpeech(text);
      expect(clean).toContain('x squared');
      expect(clean).toContain('y cubed');
    });

    it('should convert subscripts and binary bases 1101₂ to "1101 base 2"', () => {
      const text = 'Convert 1101₂ into base 10₁₀';
      const clean = service.cleanTextForSpeech(text);
      expect(clean).toContain('1101 base 2');
      expect(clean).toContain('10 base 10');
    });

    it('should convert chemistry reaction arrows -> to "yields"', () => {
      const text = '2H2 + O2 -> 2H2O';
      const clean = service.cleanTextForSpeech(text);
      expect(clean).toContain('yields');
    });
  });

  describe('generateLessonAudio', () => {
    it('should throw NotFoundException if lesson does not exist', async () => {
      mockLessonModel.findById.mockImplementationOnce(() => createQueryMock(null));

      await expect(service.generateLessonAudio('nonexistent_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should synthesize audio, upload to Cloudinary/storage, and update lesson with version hash', async () => {
      const unupdatedLesson = {
        ...mockLesson,
        contentHash: 'different_hash_triggering_regeneration',
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      mockLessonModel.findById.mockImplementationOnce(() => createQueryMock(unupdatedLesson));

      const result = await service.generateLessonAudio('lesson_math_1', 'en-US-Neural2-F', true);
      expect(result).toBeDefined();
      expect(result.audioUrl).toBeDefined();
      expect(result.audioVoice).toBe('en-US-Neural2-F');
      expect(result.audioVersion).toBeGreaterThanOrEqual(1);
    });

    it('should reuse cached audio when content hash has not changed (zero redundant TTS synthesis)', async () => {
      const currentHash = service.computeContentHash(mockLesson.content);
      const cachedLesson = {
        ...mockLesson,
        contentHash: currentHash,
        audioStatus: 'ready',
        audioUrl: 'https://res.cloudinary.com/kbgidkub/video/upload/cached.mp3',
        save: jest.fn(),
      };
      mockLessonModel.findById.mockImplementationOnce(() => createQueryMock(cachedLesson));

      const reuseCheck = await service.generateLessonAudio('lesson_math_1', 'en-US-Neural2-F', false);
      expect(reuseCheck.audioUrl).toBe('https://res.cloudinary.com/kbgidkub/video/upload/cached.mp3');
      // Cloudinary upload should not be invoked when audio cache hit
      expect(mockCloudinaryService.uploadAudioBuffer).not.toHaveBeenCalled();
    });
  });
});
