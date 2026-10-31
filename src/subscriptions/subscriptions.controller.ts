import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('packages')
  @ApiOperation({ summary: 'Create a new subscription package' })
  createPackage(@Body() body: any) {
    return this.subscriptionsService.createPackage(body);
  }

  @Get('packages')
  @ApiOperation({ summary: 'Get all subscription packages' })
  findAllPackages() {
    return this.subscriptionsService.findAllPackages();
  }

  @Patch('packages/:id')
  @ApiOperation({ summary: 'Update a subscription package' })
  updatePackage(@Param('id') id: string, @Body() body: any) {
    return this.subscriptionsService.updatePackage(id, body);
  }

  @Delete('packages/:id')
  @ApiOperation({ summary: 'Delete a subscription package' })
  deletePackage(@Param('id') id: string) {
    return this.subscriptionsService.deletePackage(id);
  }

  @Get('packages/:id')
  @ApiOperation({ summary: 'Get subscription package by ID' })
  findPackageById(@Param('id') id: string) {
    return this.subscriptionsService.findPackageById(id);
  }

  @Get('admin/finances')
  @ApiOperation({ summary: 'Admin overview of revenue, transactions, and earnings with date range filters' })
  getAdminFinances(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('classLevel') classLevel?: string,
  ) {
    return this.subscriptionsService.getAdminFinancesOverview({ startDate, endDate, classLevel });
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin list of all student subscriptions' })
  getAdminSubscriptions(@Query('status') status?: string) {
    return this.subscriptionsService.getAdminSubscriptionsList(status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-active')
  @ApiOperation({ summary: 'Get current user active subscription (optionally for a specific classLevel)' })
  getMyActiveSubscription(@Request() req: any, @Query('classLevel') classLevel?: string) {
    return this.subscriptionsService.getUserActiveSubscription(req.user.id || req.user._id, classLevel);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-active-all')
  @ApiOperation({ summary: 'Get all active subscriptions across classes for current user' })
  getMyActiveSubscriptions(@Request() req: any) {
    return this.subscriptionsService.getUserActiveSubscriptions(req.user.id || req.user._id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-history')
  @ApiOperation({ summary: 'Get current user subscription and payment history' })
  getMyHistory(@Request() req: any) {
    return this.subscriptionsService.getUserSubscriptionHistory(req.user.id || req.user._id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('check-access')
  @ApiOperation({ summary: 'Check if student can access topic / lesson (free trial or active subscription)' })
  checkAccess(
    @Request() req: any,
    @Query('topicId') topicId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('classLevel') classLevel?: string,
  ) {
    return this.subscriptionsService.checkLessonAccess(
      req.user.id || req.user._id,
      topicId,
      lessonId,
      classLevel,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('record-progress')
  @ApiOperation({ summary: 'Record lesson or topic completion' })
  recordProgress(
    @Request() req: any,
    @Body() body: { topicId: string; lessonId: string; isQuizFinished?: boolean },
  ) {
    return this.subscriptionsService.recordLessonProgress(
      req.user.id,
      body.topicId,
      body.lessonId,
      body.isQuizFinished,
    );
  }

  @Post('cron/process-reminders')
  @ApiOperation({ summary: 'Process 2-week reminders and 7-day grace period transitions' })
  processReminders() {
    return this.subscriptionsService.processSubscriptionReminders();
  }
}
