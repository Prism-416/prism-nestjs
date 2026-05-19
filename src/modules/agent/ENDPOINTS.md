# Agent Endpoint Requirements

This module is backed by the agent tables in `.sql/ddl.sql`:

- `prism_agent_runs_l`
- `prism_agent_steps_l`
- `prism_agent_actions_l`
- `prism_agent_action_events_l`

All external endpoints should be authenticated and project-scoped under
`/projects/:projectId`. Every use case should first verify that the current
user belongs to the requested project through the active workspace membership
path used by the existing project-scoped modules.

## Candidate External Endpoints

```text
GET  /projects/:projectId/agent-runs
POST /projects/:projectId/agent-runs
GET  /projects/:projectId/agent-runs/:runId
POST /projects/:projectId/agent-runs/:runId/cancel

GET  /projects/:projectId/agent-runs/:runId/steps
GET  /projects/:projectId/agent-runs/:runId/actions

GET  /projects/:projectId/agent-actions/:actionId
GET  /projects/:projectId/agent-actions/:actionId/events
POST /projects/:projectId/agent-actions/:actionId/approve
POST /projects/:projectId/agent-actions/:actionId/cancel
```

## Run Requirements

- List runs by project with filters for `status`, `agentType`, `workItemId`,
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
  project. The DDL references `prism_work_items_l(item_id)` directly, so the API
  layer must enforce the project boundary.
- If `parentRunId` is supplied, validate that the parent run belongs to the same
  project.

## Step Requirements

- Steps are read-only for the first public API pass.
- List steps for a run ordered by `stepOrder`.
- Ensure the run belongs to the requested project before returning steps.
- Future internal writers should preserve the `(run_id, step_order)` uniqueness.

## Action Requirements

- List actions for a run and retrieve one action by id.
- Approve an action only when `requiresApproval` is true and the action is still
  in an approvable status.
- Cancelling an action should append an action event.
- Approval should update `approvedByUserId` and `approvedAt`, then append an
  action event in the same transaction.

Validation requirements:

- Ensure each action belongs to the requested project.
- If an action has a `stepId`, ensure that step belongs to the action run.
- Keep status-transition rules in the use case instead of the controller.

## Event Requirements

- List action events ordered by creation time.
- Event creation should be internal to action/run state transitions at first.
- Public event creation should wait until there is a concrete product workflow
  requiring user comments or audit annotations.
