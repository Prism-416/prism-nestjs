import { DomainError, NotExistsError } from '@/core/errors';

export class AgentWorkspaceNotFoundError extends NotExistsError {
  constructor() {
    super('Workspace not found.', 'AGENT_WORKSPACE_NOT_FOUND');
  }
}

export class AgentRunNotFoundError extends NotExistsError {
  constructor() {
    super('Agent run not found.', 'AGENT_RUN_NOT_FOUND');
  }
}

export class AgentRunNotCancellableError extends DomainError {
  constructor() {
    super('Agent run cannot be cancelled.', 'AGENT_RUN_NOT_CANCELLABLE', 400);
  }
}

export class AgentWorkItemNotFoundError extends NotExistsError {
  constructor() {
    super('Work item not found.', 'AGENT_WORK_ITEM_NOT_FOUND');
  }
}

export class AgentParentRunNotFoundError extends NotExistsError {
  constructor() {
    super('Parent agent run not found.', 'AGENT_PARENT_RUN_NOT_FOUND');
  }
}

export class AgentActionNotFoundError extends NotExistsError {
  constructor() {
    super('Agent action not found.', 'AGENT_ACTION_NOT_FOUND');
  }
}

export class AgentActionNotApprovableError extends DomainError {
  constructor() {
    super(
      'Agent action cannot be approved.',
      'AGENT_ACTION_NOT_APPROVABLE',
      400,
    );
  }
}

export class AgentActionNotCancellableError extends DomainError {
  constructor() {
    super(
      'Agent action cannot be cancelled.',
      'AGENT_ACTION_NOT_CANCELLABLE',
      400,
    );
  }
}

export class AgentStepTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Agent step target does not match the current workspace state.',
      'AGENT_STEP_TARGET_MISMATCH',
      409,
    );
  }
}

export class AgentRunTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Agent run target does not match the current workspace state.',
      'AGENT_RUN_TARGET_MISMATCH',
      409,
    );
  }
}

export class AgentActionTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Agent action target does not match the current workspace state.',
      'AGENT_ACTION_TARGET_MISMATCH',
      409,
    );
  }
}

export class AgentMemoryNotFoundError extends NotExistsError {
  constructor() {
    super('Agent memory not found.', 'AGENT_MEMORY_NOT_FOUND');
  }
}

export class AgentMemoryTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Agent memory target does not match the current workspace state.',
      'AGENT_MEMORY_TARGET_MISMATCH',
      409,
    );
  }
}

export class AgentMemoryEmbeddingTargetMismatchError extends DomainError {
  constructor() {
    super(
      'Agent memory embedding target no longer matches the current memory.',
      'AGENT_MEMORY_EMBEDDING_TARGET_MISMATCH',
      409,
    );
  }
}

export class AgentWorkflowTriggerNotSupportedError extends DomainError {
  constructor() {
    super(
      'Agent workflow trigger is not supported.',
      'AGENT_WORKFLOW_TRIGGER_NOT_SUPPORTED',
      400,
    );
  }
}
