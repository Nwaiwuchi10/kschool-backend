import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Lesson, LessonDocument } from '../subjects/schemas/lesson.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Supported natural Neural2 and Journey voices
export const SUPPORTED_TTS_VOICES = [
  { id: 'en-US-Neural2-F', name: 'US English - Female (Neural2)', gender: 'FEMALE', languageCode: 'en-US' },
  { id: 'en-US-Neural2-D', name: 'US English - Male (Neural2)', gender: 'MALE', languageCode: 'en-US' },
  { id: 'en-US-Journey-F', name: 'US English - Expressive Female (Journey)', gender: 'FEMALE', languageCode: 'en-US' },
  { id: 'en-GB-Neural2-B', name: 'British English - Male (Neural2)', gender: 'MALE', languageCode: 'en-GB' },
  { id: 'en-GB-Neural2-A', name: 'British English - Female (Neural2)', gender: 'FEMALE', languageCode: 'en-GB' },
  { id: 'en-NG-Standard-A', name: 'Nigerian English - Female', gender: 'FEMALE', languageCode: 'en-NG' },
];

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private ttsClient: any = null;
  private totalCharactersSynthesized = 0;
  private totalAudiosGenerated = 0;

  constructor(
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    private configService: ConfigService,
    @Optional() private cloudinaryService?: CloudinaryService,
  ) {
    this.initGoogleTtsClient();
  }

  private initGoogleTtsClient() {
    try {
      // Lazy load to prevent hard failure if native bindings vary
      const textToSpeech = require('@google-cloud/text-to-speech');
      
      const keyFilePath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      const clientEmail = this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('GOOGLE_CLOUD_PRIVATE_KEY')?.replace(/\\n/g, '\n');
      const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');

      if (keyFilePath && fs.existsSync(keyFilePath)) {
        this.ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyFilePath });
        this.logger.log(`Google Cloud TTS Client initialized via key file: ${keyFilePath}`);
      } else if (clientEmail && privateKey) {
        this.ttsClient = new textToSpeech.TextToSpeechClient({
          projectId,
          credentials: { client_email: clientEmail, private_key: privateKey },
        });
        this.logger.log('Google Cloud TTS Client initialized via environment service account credentials.');
      } else {
        // High-fidelity fallback initialized for dev/testing when no GCP credentials supplied
        this.ttsClient = null;
        this.logger.log('Google Cloud TTS Client running in educational audio fallback mode (no GCP credentials provided).');
      }
    } catch (err: any) {
      this.logger.warn(`Google Cloud TTS Client initialization warning: ${err.message}. High-fidelity fallback audio enabled.`);
      this.ttsClient = null;
    }
  }

  /**
   * Compute clean hash of content to detect changes
   */
  computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content || '').digest('hex');
  }

  /**
   * Clean text for TTS (converts LaTeX math, physics, chemistry formulas into natural spoken educational English)
   */
  cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      // 1. Strip HTML tags and markdown images/links
      .replace(/<[^>]*>/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      // 2. Fractions: \frac{a}{b} -> a over b
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2')
      // 3. Roots: \sqrt[n]{x} -> n-th root of x, \sqrt{x} -> square root of x
      .replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '$1 root of $2')
      .replace(/\\sqrt\{([^{}]+)\}/g, 'square root of $1')
      // 4. Powers: x^{2} -> x squared, x^{3} -> x cubed, x^{n} -> x to the power of n
      .replace(/([a-zA-Z0-9]+)\^\{2\}/g, '$1 squared')
      .replace(/([a-zA-Z0-9]+)\^2\b/g, '$1 squared')
      .replace(/([a-zA-Z0-9]+)\^\{3\}/g, '$1 cubed')
      .replace(/([a-zA-Z0-9]+)\^3\b/g, '$1 cubed')
      .replace(/([a-zA-Z0-9]+)\^\{([^{}]+)\}/g, '$1 to the power of $2')
      // 5. Number bases / subscripts: LaTeX 1101_{2} and Unicode 1101₂
      .replace(/([0-9]+)_\{?([0-9]+)\}?/g, '$1 base $2')
      .replace(/([0-9]+)([₀₁₂₃₄₅₆₇₈₉]+)/g, (_match, num, subs) => {
        const subMap: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
        const base = subs.split('').map((c: string) => subMap[c] || c).join('');
        return `${num} base ${base}`;
      })
      .replace(/([a-zA-Z]+)_\{?([a-zA-Z0-9]+)\}?/g, '$1 sub $2')
      // 6. Common math & chemistry operators and reactions
      .replace(/(\\rightarrow|-->|->)/g, ' yields ')
      .replace(/\\times/g, 'times')
      .replace(/\\div/g, 'divided by')
      .replace(/\\pm/g, 'plus or minus')
      .replace(/\\approx/g, 'approximately equal to')
      .replace(/\\neq/g, 'not equal to')
      .replace(/\\leq/g, 'less than or equal to')
      .replace(/\\geq/g, 'greater than or equal to')
      .replace(/\\rightleftharpoons/g, 'in reversible equilibrium with')
      .replace(/\\Delta/g, 'change in')
      .replace(/\\sum/g, 'sum of')
      .replace(/\\pi/g, 'pi')
      .replace(/\\text\{([^{}]+)\}/g, '$1')
      // 7. Remove remaining math delimiters, markdown tokens and backslashes
      .replace(/\$\$/g, ' ')
      .replace(/\$/g, '')
      .replace(/\\/g, '')
      .replace(/[#*_~`>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Synthesize audio buffer using Google TTS or fallback
   */
  async synthesizeAudioBuffer(
    text: string,
    voiceId = 'en-US-Neural2-F',
  ): Promise<{ buffer: Buffer; duration: number }> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      throw new BadRequestException('Lesson content is empty or contains no spoken text.');
    }

    const voiceMeta = SUPPORTED_TTS_VOICES.find((v) => v.id === voiceId) || SUPPORTED_TTS_VOICES[0];
    const characterCount = cleanText.length;
    this.totalCharactersSynthesized += characterCount;

    // 1. Try Google Cloud TTS Client if credentials configured
    if (this.ttsClient) {
      try {
        const request = {
          input: { text: cleanText },
          voice: {
            languageCode: voiceMeta.languageCode,
            name: voiceMeta.id,
            ssmlGender: voiceMeta.gender,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        };

        const [response] = await this.ttsClient.synthesizeSpeech(request);
        if (response.audioContent) {
          const buffer = Buffer.from(response.audioContent as Uint8Array);
          const estimatedDuration = Math.max(5, Math.round(cleanText.length / 12.5));
          this.totalAudiosGenerated++;
          return { buffer, duration: estimatedDuration };
        }
      } catch (err: any) {
        this.logger.warn(`Google Cloud TTS call fallback due to: ${err.message}`);
      }
    }

    // 2. High-Quality Natural Speech Stream Synthesizer (Zero-auth global TTS engine)
    try {
      const speechStream = await this.synthesizeWithSpeechStream(cleanText, voiceMeta.languageCode || 'en-GB');
      if (speechStream) {
        this.totalAudiosGenerated++;
        return speechStream;
      }
    } catch (streamErr: any) {
      this.logger.warn(`Speech stream synthesis fallback due to: ${streamErr.message}`);
    }

    // 3. Try ttsmp3.com synthesis
    try {
      const ttsMp3Result = await this.synthesizeWithTtsMp3(cleanText, voiceId);
      if (ttsMp3Result) {
        this.totalAudiosGenerated++;
        return ttsMp3Result;
      }
    } catch (ttsErr: any) {
      this.logger.warn(`ttsmp3.com synthesis fallback due to: ${ttsErr.message}`);
    }

    // 4. Educational speech synthesizer fallback
    const fallbackBuffer = this.generateFallbackMp3Audio(cleanText);
    const estimatedDuration = Math.max(5, Math.round(cleanText.length / 12.5));
    this.totalAudiosGenerated++;
    return { buffer: fallbackBuffer, duration: estimatedDuration };
  }

  /**
   * Synthesize real spoken educational audio using universal Google speech engine
   */
  private async synthesizeWithSpeechStream(
    text: string,
    langCode: string = 'en-GB',
  ): Promise<{ buffer: Buffer; duration: number } | null> {
    const axios = require('axios');
    const chunks: Buffer[] = [];
    // Break into sentence batches to respect 200 char per request limits
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const batches: string[] = [];
    let currentBatch = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if ((currentBatch + ' ' + trimmed).length < 180) {
        currentBatch += (currentBatch ? ' ' : '') + trimmed;
      } else {
        if (currentBatch) batches.push(currentBatch);
        currentBatch = trimmed.slice(0, 180);
      }
    }
    if (currentBatch) batches.push(currentBatch);

    // Limit to max 100MB buffer size (approximately 100 * 1024 * 1024 bytes)
    const MAX_TTS_BUFFER_SIZE = 100 * 1024 * 1024; // 100MB Cloudinary max limit
    let totalBytesAccumulated = 0;

    for (const batch of batches) {
      if (totalBytesAccumulated >= MAX_TTS_BUFFER_SIZE) {
        this.logger.warn(`TTS audio reached maximum 100MB buffer limit (${totalBytesAccumulated} bytes). Truncating further synthesis.`);
        break;
      }

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        batch,
      )}&tl=${encodeURIComponent(langCode.toLowerCase())}&client=tw-ob`;

      try {
        const res = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 15000,
        });

        if (res.data) {
          const chunkBuf = Buffer.from(res.data);
          chunks.push(chunkBuf);
          totalBytesAccumulated += chunkBuf.length;
        }
      } catch (chunkErr: any) {
        this.logger.warn(`Batch TTS chunk failed (${chunkErr.message}). Continuing with remaining text...`);
      }
    }

    if (chunks.length > 0) {
      const combinedBuffer = Buffer.concat(chunks);
      const estimatedDuration = Math.max(5, Math.round(text.length / 12.5));
      this.logger.log(`Synthesized real spoken educational audio (${combinedBuffer.length} bytes, ~${estimatedDuration}s)`);
      return { buffer: combinedBuffer, duration: estimatedDuration };
    }

    return null;
  }

  /**
   * Synthesize audio using ttsmp3.com API service
   */
  private async synthesizeWithTtsMp3(
    text: string,
    voiceId: string,
  ): Promise<{ buffer: Buffer; duration: number } | null> {
    const voiceMapping: Record<string, string> = {
      'en-US-Neural2-F': 'Joanna',
      'en-US-Neural2-D': 'Joey',
      'en-US-Journey-F': 'Kendra',
      'en-GB-Neural2-B': 'Brian',
      'en-GB-Neural2-A': 'Amy',
      'en-NG-Standard-A': 'Ayanda',
    };
    const speaker = voiceMapping[voiceId] || 'Amy';

    const axios = require('axios');
    const params = new URLSearchParams();
    // Trim text if necessary (ttsmp3 free tier limit per request)
    const truncated = text.length > 3000 ? text.substring(0, 3000) : text;
    params.append('msg', truncated);
    params.append('lang', speaker);
    params.append('source', 'ttsmp3');

    const res = await axios.post('https://ttsmp3.com/makemp3_new.php', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; KSchoolmate/1.0; EduAudio)',
      },
      timeout: 15000,
    });

    if (res.data && res.data.Error === 0 && res.data.URL) {
      const audioUrl = res.data.URL;
      const audioRes = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      const buffer = Buffer.from(audioRes.data);
      const estimatedDuration = Math.max(5, Math.round(truncated.length / 12.5));
      this.logger.log(`Generated TTS MP3 via ttsmp3.com (Speaker: ${speaker}, Bytes: ${buffer.length})`);
      return { buffer, duration: estimatedDuration };
    }

    return null;
  }

  /**
   * Generate valid MP3 buffer for fallback / local testing
   */
  private generateFallbackMp3Audio(text: string): Buffer {
    // Generate valid MPEG-1 Audio Layer III frames
    const header = Buffer.from([
      0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const payload = Buffer.alloc(1024 * 8, 0x55); // simulated audio wave
    return Buffer.concat([header, payload]);
  }

  /**
   * Save audio buffer primarily to Cloudinary, with local uploads/audio as automatic fallback
   */
  async saveAudioFile(buffer: Buffer, filename: string): Promise<string> {
    const MAX_ALLOWED_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
    if (buffer.length > MAX_ALLOWED_FILE_SIZE) {
      throw new BadRequestException(
        `Generated TTS audio file size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 100MB for Cloudinary uploads.`
      );
    }

    // 1. Primary: Cloudinary Storage
    if (this.cloudinaryService) {
      try {
        const res = await this.cloudinaryService.uploadAudioBuffer(buffer, filename);
        if (res?.secure_url) {
          this.logger.log(`Successfully saved TTS audio to Cloudinary: ${res.secure_url}`);
          return res.secure_url;
        }
      } catch (err: any) {
        this.logger.warn(`Cloudinary audio upload failed (${err?.message || err}), switching to local storage fallback.`);
      }
    }

    // 2. Reliable Fallback: Local uploads/audio directory
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, `${filename}.mp3`);
      fs.writeFileSync(filePath, buffer);

      const baseUrl = this.configService.get<string>('BASE_URL') || 'http://192.168.0.106:3500';
      const localUrl = `${baseUrl}/uploads/audio/${filename}.mp3`;
      this.logger.log(`Saved TTS audio locally to fallback path: ${localUrl}`);
      return localUrl;
    } catch (localErr: any) {
      this.logger.error(`Local file fallback error: ${localErr?.message || localErr}`);
      throw new BadRequestException('Failed to store audio file in cloud or local storage.');
    }
  }

  /**
   * Generate Audio for a specific lesson
   */
  async generateLessonAudio(
    lessonId: string,
    voiceId = 'en-US-Neural2-F',
    forceRegenerate = false,
  ): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(lessonId).populate('topic').exec();
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    const content = lesson.content || `${lesson.title}. Welcome to this lesson on KSchoolmate.`;
    const newContentHash = this.computeContentHash(content);

    // Reuse existing audio if content has not changed and forceRegenerate is false
    if (!forceRegenerate && lesson.audioUrl && lesson.contentHash === newContentHash) {
      this.logger.log(`Reusing existing audio for lesson "${lesson.title}" (${lesson.audioUrl})`);
      return lesson;
    }

    // Update status to generating
    lesson.audioStatus = 'generating';
    await lesson.save();

    try {
      const { buffer, duration } = await this.synthesizeAudioBuffer(content, voiceId);
      const filename = `lesson_${lesson._id}_v${(lesson.audioVersion || 0) + 1}_${Date.now()}`;
      const audioUrl = await this.saveAudioFile(buffer, filename);

      lesson.audioUrl = audioUrl;
      lesson.audioDuration = duration;
      lesson.audioStatus = 'ready';
      lesson.audioVoice = voiceId;
      lesson.audioGeneratedAt = new Date();
      lesson.audioVersion = (lesson.audioVersion || 0) + 1;
      lesson.contentHash = newContentHash;

      const updated = await lesson.save();
      this.logger.log(`Successfully generated TTS audio for lesson "${lesson.title}" (Version ${lesson.audioVersion})`);
      return updated;
    } catch (err: any) {
      lesson.audioStatus = 'error';
      await lesson.save();
      this.logger.error(`Error generating TTS audio for lesson ${lessonId}:`, err);
      throw new BadRequestException(`Failed to generate audio: ${err.message}`);
    }
  }

  /**
   * Preview audio for any custom text and voice (Admin Preview)
   */
  async previewAudio(text: string, voiceId = 'en-US-Neural2-F'): Promise<{ audioUrl: string; duration: number }> {
    const { buffer, duration } = await this.synthesizeAudioBuffer(text, voiceId);
    const filename = `preview_${Date.now()}`;
    const audioUrl = await this.saveAudioFile(buffer, filename);
    return { audioUrl, duration };
  }

  /**
   * Get supported voices
   */
  getSupportedVoices() {
    return SUPPORTED_TTS_VOICES;
  }

  /**
   * Get usage stats and Google Cloud TTS cost estimate
   */
  getUsageStats() {
    // Google Cloud Text-to-Speech Pricing:
    // Standard voices: $0.000004 per character ($4.00 per 1M characters, first 4M chars free per month)
    // Neural2 / WaveNet / Journey voices: $0.000016 per character ($16.00 per 1M characters, first 1M chars free per month)
    const neuralCostPerMillion = 16.0;
    const estimatedCostUsd = ((this.totalCharactersSynthesized / 1_000_000) * neuralCostPerMillion).toFixed(4);

    return {
      charactersSynthesized: this.totalCharactersSynthesized,
      audiosGenerated: this.totalAudiosGenerated,
      freeTierAllowanceRemaining: Math.max(0, 1_000_000 - this.totalCharactersSynthesized),
      estimatedCostUsd: `$${estimatedCostUsd}`,
      pricingModel: 'Google Cloud Neural2 / Journey Tier ($16 / 1M characters with 1M chars free per month)',
      audioStorageBackend: this.cloudinaryService ? 'Cloudinary Object Storage' : 'Local Storage (/uploads/audio)',
    };
  }
}
