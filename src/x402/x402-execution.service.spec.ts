import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OracleExecutionError } from '../core/oracle-execution.error';
import { X402ExecutionService } from './x402-execution.service';

interface BlockchainServiceMock {
  service: jest.Mocked<BlockchainService>;
  executeActionMock: jest.Mock;
}

describe('X402ExecutionService', () => {
  const privateKey =
    '0x59c6995e998f97a5a004497e5da82c8f7f89d8b6ec7e3e3f87e8b8f2df2f4cb7';
  const contractAddress = '0x0000000000000000000000000000000000000001';
  const originalFetch = global.fetch;

  const getConfigService = (overrides: Record<string, string> = {}) => {
    const env: Record<string, string> = {
      PRIVATE_KEY: privateKey,
      CONTRACT_ADDRESS: contractAddress,
      CHAIN_ID: '11155111',
      X402_EXECUTION_MODE: 'local',
      ...overrides,
    };

    return {
      getOrThrow: (key: string) => {
        const value = env[key];
        if (!value) {
          throw new Error(`Missing ${key}`);
        }
        return value;
      },
      get: (key: string) => env[key],
    } as unknown as ConfigService;
  };

  const getBlockchainService = (): BlockchainServiceMock => {
    const executeActionMock = jest.fn().mockResolvedValue({
      txHash: '0xabc123',
      action: 'BUY',
      validationRequestId: '12',
    });

    return {
      service: {
        executeAction: executeActionMock,
      } as unknown as jest.Mocked<BlockchainService>,
      executeActionMock,
    };
  };

  const jsonResponse = (status: number, body: Record<string, unknown>) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }) as Response;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns null for NO_ACTION', async () => {
    const blockchain = getBlockchainService();
    const service = new X402ExecutionService(
      getConfigService(),
      blockchain.service,
    );

    const result = await service.executeSignedCondition({
      action: { type: 'NO_ACTION' },
      validationRequestId: null,
      taskId: 'task-1',
      dataHash: null,
    });

    expect(result).toBeNull();
  });

  it('rejects actionable execution without validationRequestId/dataHash', async () => {
    const blockchain = getBlockchainService();
    const service = new X402ExecutionService(
      getConfigService(),
      blockchain.service,
    );

    await expect(
      service.executeSignedCondition({
        action: { type: 'BUY' },
        validationRequestId: null,
        taskId: 'task-1',
        dataHash: null,
      }),
    ).rejects.toBeInstanceOf(OracleExecutionError);
  });

  it('signs, verifies, settles locally and executes on-chain call', async () => {
    const blockchain = getBlockchainService();
    const service = new X402ExecutionService(
      getConfigService(),
      blockchain.service,
    );

    const result = await service.executeSignedCondition({
      action: { type: 'BUY' },
      validationRequestId: 12n,
      taskId: 'task-1',
      dataHash: '0xabc',
    });
    const executeCalls = blockchain.executeActionMock.mock.calls as [
      unknown,
      unknown,
      unknown,
    ][];
    expect(executeCalls[0]).toEqual([{ type: 'BUY' }, 12n, 'task-1']);
    expect(result?.mode).toBe('local');
    expect(result?.conditionHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result?.conditionSignature).toMatch(/^0x[0-9a-f]{130}$/);
    expect(result?.settlementRef).toBe(`local-settle:${result?.conditionHash}`);
  });

  it('uses facilitator verify/settle endpoints when configured', async () => {
    const blockchain = getBlockchainService();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { verified: true, verificationId: 'v1' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { settlementId: 's1' }));
    global.fetch = fetchMock as typeof fetch;

    const service = new X402ExecutionService(
      getConfigService({
        X402_EXECUTION_MODE: 'facilitator',
        X402_FACILITATOR_URL: 'https://facilitator.example',
      }),
      blockchain.service,
    );

    const result = await service.executeSignedCondition({
      action: { type: 'SELL' },
      validationRequestId: 44n,
      taskId: 'task-2',
      dataHash: '0xdef',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as [string, RequestInit | undefined][];
    expect(calls[0][0]).toBe('https://facilitator.example/verify');
    expect(calls[1][0]).toBe('https://facilitator.example/settle');
    expect(result?.mode).toBe('facilitator');
    expect(result?.settlementRef).toBe('s1');
  });
});
