# Agent Endpoint Requirements

This module is backed by the agent tables in `.sql/ddl_v2.sql`:

- `prism_agent_runs_l`
- `prism_agent_steps_l`
- `prism_agent_actions_l`
- `prism_agent_action_events_l`

All external endpoints should be authenticated and workspace-scoped under
`/workspaces/:workspaceId`. Every use case should first verify that the current
user belongs to the requested workspace through the active workspace membership
path used by the existing workspace-scoped modules.

## Candidate External Endpoints

```text
GET  /workspaces/:workspaceId/agent-runs
POST /workspaces/:workspaceId/agent-runs
GET  /workspaces/:workspaceId/agent-runs/:runId
POST /workspaces/:workspaceId/agent-runs/:runId/cancel

GET  /workspaces/:workspaceId/agent-runs/:runId/steps
GET  /workspaces/:workspaceId/agent-runs/:runId/actions

GET   /workspaces/:workspaceId/agent-runs/internal/:runId/state
PATCH /workspaces/:workspaceId/agent-runs/internal/:runId/status
POST  /workspaces/:workspaceId/agent-runs/internal/:runId/steps
POST  /workspaces/:workspaceId/agent-runs/internal/:runId/actions

GET  /workspaces/:workspaceId/agent-actions/:actionId
GET  /workspaces/:workspaceId/agent-actions/:actionId/events
POST /workspaces/:workspaceId/agent-actions/:actionId/approve
POST /workspaces/:workspaceId/agent-actions/:actionId/cancel
POST /workspaces/:workspaceId/agent-actions/internal/:actionId/events
```

Internal endpoints require the `agents:invoke` service-token scope.
The internal run state endpoint returns run metadata, steps, actions, action
events, and run-scoped memories in one snapshot.

## Realtime Requirements

```text
namespace /agents

agent_workspace.join
agent_workspace.leave

agent_run.created
agent_run.updated
agent_step.created
agent_step.updated
agent_action.created
agent_action.updated
agent_action_event.created
```

Clients should join a workspace room before rendering live graph updates. The
server authorizes the join through active workspace membership, then broadcasts
agent run, step, action, and action-event updates for that workspace.

## Run Requirements

- List runs by workspace with filters for `status`, `agentType`, `workItemId`,
  and pagination.
- Create a manual run with `agentType`, `objective`, optional `workItemId`,
  optional `parentRunId`, and optional `systemPromptVersion`.
- Retrieve one run with its basic metadata.
- Cancel a queued, running, or waiting run.

Validation requirements:

- `triggerType` should use the DDL values: `manual`, `event`, `scheduled`,
  `webhook`, `recursive`.
- `status` should use the DDL values: `queued`, `running`, `waiting`,
  `completed`, `failed`, `cancelled`.
- If `workItemId` is supplied, validate that the work item belongs to the same
  workspace.
- If `parentRunId` is supplied, validate that the parent run belongs to the same
  workspace.

## Step Requirements

- Steps are read-only for the first public API pass.
- List steps for a run ordered by `stepOrder`.
- Ensure the run belongs to the requested workspace before returning steps.
- Future internal writers should preserve the `(run_id, step_order)` uniqueness.

## Action Requirements

- List actions for a run and retrieve one action by id.
- Approve an action only when `requiresApproval` is true and the action is still
  in an approvable status.
- Cancelling an action should append an action event.
- Approval should update `approvedByUserId` and `approvedAt`, then append an
  action event in the same transaction.

Validation requirements:

- Ensure each action belongs to the requested workspace.
- If an action has a `stepId`, ensure that step belongs to the action run.
- Keep status-transition rules in the use case instead of the controller.

## Event Requirements

- List action events ordered by creation time.
- Event creation should be internal to action/run state transitions at first.
- Public event creation should wait until there is a concrete product workflow
  requiring user comments or audit annotations.
