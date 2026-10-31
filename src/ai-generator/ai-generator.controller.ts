import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiGeneratorService } from './ai-generator.service';
import type { GenerateLessonDto, GenerateQuizDto } from './ai-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI Content Generator')
@Controller('ai')
export class AiGeneratorController {
  constructor(private readonly aiService: AiGeneratorService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-lesson')
  @ApiOperation({ summary: 'Generate lesson learning objectives, outlines, and content using Google Gemini AI' })
  async generateLesson(@Body() dto: GenerateLessonDto) {
    return this.aiService.generateLesson(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-quiz')
  @ApiOperation({ summary: 'Generate multiple-choice quiz questions with options & explanations using Google Gemini AI' })
  async generateQuiz(@Body() dto: GenerateQuizDto) {
    return this.aiService.generateQuiz(dto);
  }
}
