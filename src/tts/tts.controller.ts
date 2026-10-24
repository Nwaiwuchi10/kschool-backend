import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TtsService } from './tts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Text-to-Speech (TTS)')
@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate/:lessonId')
  @ApiOperation({ summary: 'Generate Google Cloud TTS audio for a lesson (Admin)' })
  @ApiBody({ schema: { type: 'object', properties: { voiceId: { type: 'string' } } } })
  generateAudio(
    @Param('lessonId') lessonId: string,
    @Body('voiceId') voiceId?: string,
  ) {
    return this.ttsService.generateLessonAudio(lessonId, voiceId, false);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('regenerate/:lessonId')
  @ApiOperation({ summary: 'Force regenerate Google Cloud TTS audio with version increment (Admin)' })
  @ApiBody({ schema: { type: 'object', properties: { voiceId: { type: 'string' } } } })
  regenerateAudio(
    @Param('lessonId') lessonId: string,
    @Body('voiceId') voiceId?: string,
  ) {
    return this.ttsService.generateLessonAudio(lessonId, voiceId, true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('preview')
  @ApiOperation({ summary: 'Preview TTS audio for any given text snippet (Admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['text'],
      properties: { text: { type: 'string' }, voiceId: { type: 'string' } },
    },
  })
  previewAudio(
    @Body('text') text: string,
    @Body('voiceId') voiceId?: string,
  ) {
    return this.ttsService.previewAudio(text, voiceId);
  }

  @Get('voices')
  @ApiOperation({ summary: 'Get list of supported Google Cloud Neural2/Journey voices' })
  getSupportedVoices() {
    return this.ttsService.getSupportedVoices();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('usage')
  @ApiOperation({ summary: 'Get Google Cloud TTS character synthesis usage and cost estimate' })
  getUsageStats() {
    return this.ttsService.getUsageStats();
  }
}
