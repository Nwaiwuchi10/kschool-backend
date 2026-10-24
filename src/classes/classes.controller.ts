import { Controller, Get, Post, Body, Patch, Param, Query, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { SelectClassDto } from './dto/select-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active classes for mobile/web client' })
  @ApiResponse({ status: 200, description: 'List of active classes ordered by curriculum progression' })
  findAll() {
    return this.classesService.findAll();
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all classes including inactive (Admin)' })
  findAllAdmin() {
    return this.classesService.findAllAdmin();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-status')
  @ApiOperation({ summary: 'Get current user class selection and subscription lock status' })
  getMyClassStatus(@Request() req: any) {
    return this.classesService.getUserClassStatus(req.user.id || req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('select')
  @ApiOperation({ summary: 'Select a class level for student (enforces paid subscription lock)' })
  selectClass(@Request() req: any, @Body() dto: SelectClassDto) {
    return this.classesService.selectClass(req.user.id || req.user.sub, dto.className);
  }

  @Get('students/overview')
  @ApiOperation({ summary: 'Get students overview with class stats' })
  @ApiQuery({ name: 'class', required: false, description: 'Class name or ID (defaults to JSS 1)' })
  getGeneralStudentsOverview(@Query('class') className?: string) {
    return this.classesService.getClassOverview(className);
  }

  @Get('students/overview/:classIdentifier')
  @ApiOperation({ summary: 'Get students overview for a specific class' })
  getClassOverviewParam(@Param('classIdentifier') classIdentifier: string) {
    return this.classesService.getClassOverview(classIdentifier);
  }

  @Get('students/:studentId/details')
  @ApiOperation({ summary: 'Get detailed syllabus progress and insights for a specific student' })
  getStudentDetails(@Param('studentId') studentId: string) {
    return this.classesService.getStudentDetails(studentId);
  }

  @Post('students/:studentId/encourage')
  @ApiOperation({ summary: 'Send encouragement message to student' })
  encourageStudent(@Param('studentId') studentId: string, @Body() body?: { message?: string }) {
    return this.classesService.encourageStudent(studentId, body?.message);
  }

  @Post('students/:studentId/assign-practice')
  @ApiOperation({ summary: 'Assign extra practice questions or homework to student' })
  assignPractice(@Param('studentId') studentId: string, @Body() body?: any) {
    return this.classesService.assignPractice(studentId, body);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'Get overview stats and students for a specific class ID' })
  getClassOverviewById(@Param('id') id: string) {
    return this.classesService.getClassOverview(id);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get student list for a class with search and status filtering' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  getClassStudents(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.classesService.getClassStudents(id, search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class by ID' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new class (Admin)' })
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a class (Admin)' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}

