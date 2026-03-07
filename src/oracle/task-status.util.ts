import {
  TaskExecutionStatus,
  TaskValidationStatus,
  type OracleTask,
} from '@prisma/client';
import { OracleTaskLifecycleStatus } from './oracle-task.types';

export function deriveTaskStatus(task: Pick<OracleTask, 'validationStatus' | 'executionStatus'>): OracleTaskLifecycleStatus {
  switch (task.executionStatus) {
    case TaskExecutionStatus.NO_ACTION:
      return 'COMPLETED_NO_ACTION';
    case TaskExecutionStatus.PROCESSING:
      return 'PROCESSING';
    case TaskExecutionStatus.EXECUTED:
      return 'EXECUTED';
    case TaskExecutionStatus.REJECTED:
      return 'REJECTED';
    case TaskExecutionStatus.FAILED:
      return 'FAILED';
    case TaskExecutionStatus.PENDING:
      if (task.validationStatus === TaskValidationStatus.PENDING) {
        return 'PENDING_VALIDATION';
      }
      return 'PROCESSING';
  }
}
