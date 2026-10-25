import { Controller, Get, Post, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  @ApiOperation({ summary: 'Get live student dashboard overview, active class subjects, overall progress, and recent activity' })
  @ApiResponse({ status: 200, description: 'Live student dashboard overview' })
  getStudentDashboard(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('classLevel') classLevel?: string,
  ) {
    const resolvedUserId = req.user?.id || req.user?._id || userId;
    return this.dashboardService.getStudentDashboardData(resolvedUserId, classLevel);
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get live admin dashboard metrics, recent activities, and announcements' })
  @ApiResponse({ status: 200, description: 'Live admin dashboard statistics and real-time feeds' })
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboardData();
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Get live teacher/instructor portal overview and stats' })
  @ApiResponse({ status: 200, description: 'Live teacher portal dashboard overview' })
  getTeacherDashboard(@Query('name') name?: string) {
    return this.dashboardService.getTeacherDashboardData(name);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  getAnnouncements() {
    return this.dashboardService.getAllAnnouncements();
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create a new announcement' })
  createAnnouncement(@Body() body: { title: string; content: string; audience?: string; pinned?: boolean }) {
    return this.dashboardService.createAnnouncement(body);
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete an announcement' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.dashboardService.deleteAnnouncement(id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get academic reports and performance analytics' })
  getReports() {
    return this.dashboardService.getReportsAnalytics();
  }
}

