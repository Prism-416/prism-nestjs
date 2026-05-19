import { DomainError, NotExistsError } from '@/core/errors';

export class AgentProjectNotFoundError extends NotExistsError {
  constructor() {
    super('Project not found.', 'AGENT_PROJECT_NOT_FOUND');
  }
}

export class AgentRunNotFoundError extends NotExistsError {
  constructor() {
    super('Agent run not found.', 'AGENT_RUN_NOT_FOUND');
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
