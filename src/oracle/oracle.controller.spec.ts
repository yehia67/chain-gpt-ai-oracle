import { Test, TestingModule } from '@nestjs/testing';
import { OracleController } from './oracle.controller';
import { OracleTaskService } from './oracle-task.service';

describe('OracleController', () => {
  let controller: OracleController;
  let oracleTaskService: jest.Mocked<OracleTaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OracleController],
      providers: [
        {
          provide: OracleTaskService,
          useValue: {
            createNewsTask: jest.fn(),
            getTask: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OracleController>(OracleController);
    oracleTaskService = module.get(OracleTaskService);
  });

  it('returns async task response for POST /oracle/news', async () => {
    oracleTaskService.createNewsTask.mockResolvedValue({
      taskId: 'task-1',
      status: 'PENDING_VALIDATION',
      action: 'BUY',
      validationRequestId: '12',
    });

    await expect(controller.runNewsSentiment()).resolves.toEqual({
      taskId: 'task-1',
      status: 'PENDING_VALIDATION',
      action: 'BUY',
      validationRequestId: '12',
    });
  });

  it('returns task details for GET /oracle/tasks/:taskId', async () => {
    oracleTaskService.getTask.mockResolvedValue({
      taskId: 'task-2',
      status: 'EXECUTED',
      action: 'SELL',
      sentiment: 'NEGATIVE',
      confidence: 0.71,
      rawResponse: '{}',
      dataHash: '0xabc',
      validationRequestId: '8',
      validationStatus: 'VERIFIED',
      executionStatus: 'EXECUTED',
      txHash: '0x123',
      validationProofUri: 'ipfs://proof',
      feedbackUri: 'ipfs://feedback',
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(controller.getTask('task-2')).resolves.toMatchObject({
      taskId: 'task-2',
      status: 'EXECUTED',
      action: 'SELL',
    });
  });
});
