export const AGENT_REALTIME_NAMESPACE = '/agents';

export const AGENT_REALTIME_EVENTS = {
  AGENT_WORKSPACE_JOIN: 'agent_workspace.join',
  AGENT_WORKSPACE_JOINED: 'agent_workspace.joined',
  AGENT_WORKSPACE_LEAVE: 'agent_workspace.leave',
  AGENT_WORKSPACE_LEFT: 'agent_workspace.left',
  AGENT_RUN_CREATED: 'agent_run.created',
  AGENT_RUN_UPDATED: 'agent_run.updated',
  AGENT_STEP_CREATED: 'agent_step.created',
  AGENT_STEP_UPDATED: 'agent_step.updated',
  AGENT_ACTION_CREATED: 'agent_action.created',
  AGENT_ACTION_UPDATED: 'agent_action.updated',
  AGENT_ACTION_EVENT_CREATED: 'agent_action_event.created',
} as const;
