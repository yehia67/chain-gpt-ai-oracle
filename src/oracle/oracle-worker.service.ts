import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OracleActionType,
  TaskExecutionStatus,
  TaskValidationStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { A2aService } from '../a2a/a2a.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OracleAction } from '../strategies/oracle-strategy.interface';

@Injectable()
export class OracleWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OracleWorkerService.name);
  private readonly pollIntervalMs: number;
  private intervalRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly a2aService: A2aService,
    private readonly blockchainService: BlockchainService,
  ) {
    this.pollIntervalMs = Number(
      this.configService.get('WORKER_POLL_MS') ?? 10_000,
    );
  }

  onModuleInit(): void {
    this.intervalRef = setInterval(() => {
      void this.processPendingTasks();
    }, this.pollIntervalMs);

    void this.processPendingTasks();
    this.logger.log(`Oracle worker started with interval ${this.pollIntervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private async processPendingTasks(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const tasks = await this.prismaService.oracleTask.findMany({
        where: {
          validationStatus: TaskValidationStatus.PENDING,
          executionStatus: TaskExecutionStatus.PENDING,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 20,
      });

      for (const task of tasks) {
        await this.processTask(task.taskId);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const claim = await this.prismaService.oracleTask.updateMany({
      where: {
        taskId,
        executionStatus: TaskExecutionStatus.PENDING,
      },
      data: {
        executionStatus: TaskExecutionStatus.PROCESSING,
      },
    });

    if (claim.count === 0) {
      return;
    }

    const task = await this.prismaService.oracleTask.findUnique({ where: { taskId } });
    if (!task || task.validationRequestId === null || !task.dataHash) {
      return;
    }

    const logPrefix = `[taskId=${task.taskId}][validationRequestId=${task.validationRequestId.toString()}]`;

    try {
      this.logger.log(`${logPrefix} Processing task`);

      let validation = await this.a2aService.getValidation(task.validationRequestId);
      let proofUri = validation.proofUri;

      if (!validation.responded) {
        const proofPayload = {
          validation_request_id: task.validationRequestId.toString(),
          task_id: task.taskId,
          data_hash: task.dataHash,
          validation_type: 'LLM_OUTPUT_HASH',
          validator_agent: this.a2aService.getSignerAddress(),
          status: 'verified',
          timestamp: new Date().toISOString(),
        };

        proofUri = await this.a2aService.pinJson(
          `validation-proof-${task.taskId}`,
          proofPayload,
        );

        await this.a2aService.submitValidationResponse(
          task.validationRequestId,
          proofUri,
          true,
        );

        validation = await this.a2aService.getValidation(task.validationRequestId);
      }

      if (!validation.verified) {
        await this.prismaService.oracleTask.update({
          where: { taskId: task.taskId },
          data: {
            validationStatus: TaskValidationStatus.REJECTED,
            executionStatus: TaskExecutionStatus.REJECTED,
            validationProofUri: proofUri,
            errorMessage: 'Validation rejected by validator',
          },
        });
        this.logger.warn(`${logPrefix} Validation rejected`);
        return;
      }

      const action: OracleAction = {
        type: task.action as OracleAction['type'],
      };

      const blockchainResult = await this.blockchainService.executeAction(
        action,
        task.validationRequestId,
        task.taskId,
      );

      const feedbackPayload = {
        feedback_id: `fbk_${task.taskId}`,
        client_agent: this.a2aService.getSignerAddress(),
        server_agent: this.a2aService.getSignerAddress(),
        task_id: task.taskId,
        ratings: {
          accuracy: 5,
          reliability: 5,
          timeliness: 5,
        },
        comments: 'Validation and execution completed successfully.',
        timestamp: new Date().toISOString(),
      };

      const feedbackUri = await this.a2aService.pinJson(
        `feedback-${task.taskId}`,
        feedbackPayload,
      );

      await this.a2aService.submitFeedback(
        this.a2aService.getSignerAddress(),
        feedbackUri,
      );

      await this.prismaService.oracleTask.update({
        where: { taskId: task.taskId },
        data: {
          validationStatus: TaskValidationStatus.VERIFIED,
          executionStatus: TaskExecutionStatus.EXECUTED,
          txHash: blockchainResult?.txHash ?? null,
          validationProofUri: proofUri,
          feedbackUri,
          errorMessage: null,
        },
      });

      this.logger.log(`${logPrefix} Task executed successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown worker error';
      this.logger.error(`${logPrefix} Worker task failed: ${message}`, err);

      await this.prismaService.oracleTask.update({
        where: { taskId: task.taskId },
        data: {
          validationStatus: TaskValidationStatus.FAILED,
          executionStatus: TaskExecutionStatus.FAILED,
          errorMessage: message,
        },
      });
    }
  }
}
