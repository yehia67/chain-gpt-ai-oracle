import { TaskExecutionStatus, TaskValidationStatus } from '@prisma/client';
import { deriveTaskStatus } from './task-status.util';

describe('task-status.util', () => {
  it('maps pending validation to PENDING_VALIDATION', () => {
    expect(
      deriveTaskStatus({
        executionStatus: TaskExecutionStatus.PENDING,
        validationStatus: TaskValidationStatus.PENDING,
      }),
    ).toBe('PENDING_VALIDATION');
  });

  it('maps executed tasks to EXECUTED', () => {
    expect(
      deriveTaskStatus({
        executionStatus: TaskExecutionStatus.EXECUTED,
        validationStatus: TaskValidationStatus.VERIFIED,
      }),
    ).toBe('EXECUTED');
  });

  it('maps rejected tasks to REJECTED', () => {
    expect(
      deriveTaskStatus({
        executionStatus: TaskExecutionStatus.REJECTED,
        validationStatus: TaskValidationStatus.REJECTED,
      }),
    ).toBe('REJECTED');
  });
});
