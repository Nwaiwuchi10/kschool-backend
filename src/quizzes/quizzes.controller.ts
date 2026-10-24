import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quizzes & Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('topic/:topicId')
  @ApiOperation({ summary: 'Create a quiz under a topic' })
  createQuiz(@Param('topicId') topicId: string, @Body() body: any) {
    return this.quizzesService.createQuiz(topicId, body);
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'Get all quizzes under a topic' })
  findQuizzesByTopic(@Param('topicId') topicId: string) {
    return this.quizzesService.findQuizzesByTopic(topicId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes across the curriculum' })
  findAllQuizzes() {
    return this.quizzesService.findAllQuizzes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz details and questions' })
  findQuizById(@Param('id') id: string) {
    return this.quizzesService.findQuizById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quiz and questions (Admin)' })
  updateQuiz(@Param('id') id: string, @Body() body: any) {
    return this.quizzesService.updateQuiz(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quiz (Admin)' })
  deleteQuiz(@Param('id') id: string) {
    return this.quizzesService.deleteQuiz(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit quiz answers' })
  @ApiBody({ schema: { type: 'object', properties: { answers: { type: 'array', items: { type: 'number' } } } } })
  submitQuiz(@Request() req: any, @Param('id') id: string, @Body('answers') answers: number[]) {
    return this.quizzesService.submitQuiz(req.user.id, id, answers);
  }

  @Get('user/results')
  @ApiOperation({ summary: 'Get current user quiz results' })
  getUserResults(@Request() req: any) {
    return this.quizzesService.getUserResults(req.user.id);
  }

  // ==========================================
  // EXERCISES / PRACTICE SHEETS ENDPOINTS
  // ==========================================
  @Post('exercises/create')
  @ApiOperation({ summary: 'Create an exercise / practice sheet (Admin)' })
  createExercise(@Body() body: any) {
    return this.quizzesService.createExercise(body);
  }

  @Get('exercises/all')
  @ApiOperation({ summary: 'Get all exercises with optional filters' })
  findAllExercises(
    @Request() req: any,
  ) {
    const classLevel = req.query?.classLevel;
    const subject = req.query?.subject;
    return this.quizzesService.findAllExercises({ classLevel, subject });
  }

  @Get('exercises/:exerciseId')
  @ApiOperation({ summary: 'Get single exercise details' })
  findExerciseById(@Param('exerciseId') exerciseId: string) {
    return this.quizzesService.findExerciseById(exerciseId);
  }

  @Patch('exercises/:exerciseId')
  @ApiOperation({ summary: 'Update an exercise (Admin)' })
  updateExercise(@Param('exerciseId') exerciseId: string, @Body() body: any) {
    return this.quizzesService.updateExercise(exerciseId, body);
  }

  @Delete('exercises/:exerciseId')
  @ApiOperation({ summary: 'Delete an exercise (Admin)' })
  deleteExercise(@Param('exerciseId') exerciseId: string) {
    return this.quizzesService.deleteExercise(exerciseId);
  }
}
