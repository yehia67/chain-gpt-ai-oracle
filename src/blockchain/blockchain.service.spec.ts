import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { OracleExecutionError } from '../core/oracle-execution.error';

describe('BlockchainService', () => {
  const getConfigService = () => {
    const env: Record<string, string> = {
      RPC_URL: 'https://rpc.example',
      PRIVATE_KEY:
        '0x59c6995e998f97a5a004497e5da82c8f7f89d8b6ec7e3e3f87e8b8f2df2f4cb7',
      CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
    };

    return {
      getOrThrow: (key: string) => {
        const value = env[key];
        if (!value) {
          throw new Error(`Missing ${key}`);
        }
        return value;
      },
    } as unknown as ConfigService;
  };

  it('returns null for NO_ACTION', async () => {
    const service = new BlockchainService(getConfigService());

    const result = await service.executeAction({ type: 'NO_ACTION' }, null);

    expect(result).toBeNull();
  });

  it('wraps contract call errors as OracleExecutionError', async () => {
    const service = new BlockchainService(getConfigService());

    (service as any).contract = {
      buy: jest.fn().mockRejectedValue(new Error('tx failed')),
      sell: jest.fn(),
    };

    await expect(service.executeAction({ type: 'BUY' }, 1n)).rejects.toBeInstanceOf(
      OracleExecutionError,
    );
  });
});
