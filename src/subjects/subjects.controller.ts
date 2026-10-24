import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subjects & Curriculum')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  createSubject(@Body() body: any) {
    return this.subjectsService.createSubject(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subjects with optional classLevel filter' })
  @ApiQuery({ name: 'classLevel', required: false, type: String })
  findAllSubjects(@Query('classLevel') classLevel?: string) {
    return this.subjectsService.findAllSubjects(classLevel);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject details including topics and lessons' })
  findSubjectById(@Param('id') id: string) {
    return this.subjectsService.findSubjectById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a subject and its linked classes' })
  updateSubject(@Param('id') id: string, @Body() body: any) {
    return this.subjectsService.updateSubject(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subject' })
  deleteSubject(@Param('id') id: string) {
    return this.subjectsService.deleteSubject(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/topics')
  @ApiOperation({ summary: 'Create a new topic under a subject' })
  createTopic(@Param('id') id: string, @Body() body: any) {
    return this.subjectsService.createTopic(id, body);
  }

  @Get('topics/:topicId/lessons')
  @ApiOperation({ summary: 'Get all lessons belonging to a specific topic' })
  findLessonsByTopic(@Param('topicId') topicId: string) {
    return this.subjectsService.findLessonsByTopic(topicId);
  }

  @Get('topics/:topicId')
  @ApiOperation({ summary: 'Get a topic and its lessons' })
  findTopicById(@Param('topicId') topicId: string) {
    return this.subjectsService.findTopicById(topicId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('topics/:topicId/lessons')
  @ApiOperation({ summary: 'Create a lesson under a topic' })
  createLesson(@Param('topicId') topicId: string, @Body() body: any) {
    return this.subjectsService.createLesson(topicId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('topics/:topicId')
  @ApiOperation({ summary: 'Update a topic (Admin)' })
  updateTopic(@Param('topicId') topicId: string, @Body() body: any) {
    return this.subjectsService.updateTopic(topicId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('topics/:topicId')
  @ApiOperation({ summary: 'Delete a topic (Admin)' })
  deleteTopic(@Param('topicId') topicId: string) {
    return this.subjectsService.deleteTopic(topicId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('lessons')
  @ApiOperation({ summary: 'Create a standalone lesson or link directly to subject/classes' })
  createStandaloneLesson(@Body() body: any) {
    return this.subjectsService.createStandaloneLesson(body);
  }

  @Get('lessons/all')
  @ApiOperation({ summary: 'Get all curriculum lessons with optional filters (Admin)' })
  @ApiQuery({ name: 'classLevel', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  findAllLessons(
    @Query('classLevel') classLevel?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.subjectsService.findAllLessons({ classLevel, subjectId });
  }

  @Get('lessons/:lessonId')
  @ApiOperation({ summary: 'Get single lesson details' })
  findLessonById(@Param('lessonId') lessonId: string) {
    return this.subjectsService.findLessonById(lessonId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('lessons/:lessonId')
  @ApiOperation({ summary: 'Update a lesson (Admin)' })
  updateLesson(@Param('lessonId') lessonId: string, @Body() body: any) {
    return this.subjectsService.updateLesson(lessonId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('lessons/:lessonId')
  @ApiOperation({ summary: 'Delete a lesson (Admin)' })
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.subjectsService.deleteLesson(lessonId);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed standard Nigerian curriculum subjects and topics' })
  seed() {
    return this.subjectsService.seedSubjects();
  }
}
