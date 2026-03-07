import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OracleActionType,
  Prisma,
  TaskExecutionStatus,
  TaskValidationStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AIOracleEngine } from '../core/ai-oracle.engine';
import { OracleExecutionError } from '../core/oracle-execution.error';
import { NewsService } from '../news/news.service';
import { NewsSentimentStrategy } from '../strategies/news-sentiment.strategy';
import { PrismaService } from '../database/prisma.service';
import { A2aService } from '../a2a/a2a.service';
import {
  CreateOracleTaskResponse,
  OracleTaskDetailsResponse,
} from './oracle-task.types';
import { deriveTaskStatus } from './task-status.util';
import { buildTaskDataHash } from './hash.util';

@Injectable()
export class OracleTaskService {
  private readonly logger = new Logger(OracleTaskService.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly oracleEngine: AIOracleEngine,
    private readonly prismaService: PrismaService,
    private readonly a2aService: A2aService,
  ) {}

  async createNewsTask(): Promise<CreateOracleTaskResponse> {
    const taskId = randomUUID();
    this.logger.log(`[taskId=${taskId}] Creating news oracle task`);

    try {
      const news = await this.newsService.getEthNews();
      const result = await this.oracleEngine.execute(
        new NewsSentimentStrategy(),
        news,
      );

      const action = result.action.type as OracleActionType;
      const sentiment = result.decision.sentiment;
      const confidence = result.decision.confidence;
      const newsPayload = JSON.parse(
        JSON.stringify(news),
      ) as Prisma.InputJsonValue;

      if (action === OracleActionType.NO_ACTION) {
        await this.prismaService.oracleTask.create({
          data: {
            taskId,
            action,
            sentiment,
            confidence,
            rawResponse: result.rawResponse,
            validationStatus: TaskValidationStatus.NOT_REQUIRED,
            executionStatus: TaskExecutionStatus.NO_ACTION,
            newsPayload,
          },
        });

        return {
          taskId,
          status: 'COMPLETED_NO_ACTION',
          action,
          validationRequestId: null,
        };
      }

      const dataHash = buildTaskDataHash({
        taskId,
        action,
        news,
        decision: result.decision,
        rawResponse: result.rawResponse,
      });

      const validation = await this.a2aService.requestValidation(dataHash);

      await this.prismaService.oracleTask.create({
        data: {
          taskId,
          action,
          sentiment,
          confidence,
          rawResponse: result.rawResponse,
          newsPayload,
          dataHash,
          validationRequestId: validation.requestId,
          validationStatus: TaskValidationStatus.PENDING,
          executionStatus: TaskExecutionStatus.PENDING,
        },
      });

      return {
        taskId,
        status: 'PENDING_VALIDATION',
        action,
        validationRequestId: validation.requestId.toString(),
      };
    } catch (err: unknown) {
      const message =
        err instanceof OracleExecutionError
          ? err.message
          : 'Failed to create oracle task';
      this.logger.error(`[taskId=${taskId}] ${message}`, err);
      throw new InternalServerErrorException(message);
    }
  }

  async getTask(taskId: string): Promise<OracleTaskDetailsResponse> {
    const task = await this.prismaService.oracleTask.findUnique({
      where: { taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return {
      taskId: task.taskId,
      status: deriveTaskStatus(task),
      action: task.action,
      sentiment: task.sentiment,
      confidence: task.confidence,
      rawResponse: task.rawResponse,
      dataHash: task.dataHash,
      validationRequestId: task.validationRequestId?.toString() ?? null,
      validationStatus: task.validationStatus,
      executionStatus: task.executionStatus,
      txHash: task.txHash,
      validationProofUri: task.validationProofUri,
      feedbackUri: task.feedbackUri,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
