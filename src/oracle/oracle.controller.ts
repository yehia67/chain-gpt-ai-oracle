import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { OracleTaskService } from './oracle-task.service';
import {
  CreateOracleTaskResponse,
  OracleTaskDetailsResponse,
} from './oracle-task.types';

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleTaskService: OracleTaskService) {}

  @Post('news')
  @HttpCode(HttpStatus.ACCEPTED)
  async runNewsSentiment(): Promise<CreateOracleTaskResponse> {
    return this.oracleTaskService.createNewsTask();
  }

  @Get('tasks/:taskId')
  async getTask(@Param('taskId') taskId: string): Promise<OracleTaskDetailsResponse> {
    return this.oracleTaskService.getTask(taskId);
  }
}
