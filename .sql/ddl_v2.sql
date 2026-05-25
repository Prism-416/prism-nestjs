-- Prism Fresh Core Schema DDL
-- Assumption: this schema is created from scratch.
-- Direction:
-- 1. Workspace = product/team boundary
-- 2. Project = feature / initiative / context boundary
-- 3. Sprint = workspace-level timebox
-- 4. WorkItem = two-level task/subtask node, without type
-- 5. WorkItem relations = graph edges for dependency/reference
-- 6. Projects do not have separate members; all workspace members share projects
-- 7. Jobs are workspace-level roles/capabilities

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- Users / Auth
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_users_l
(
    user_id    UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email      VARCHAR(320) NOT NULL,
    full_name  VARCHAR(100) NOT NULL,
    username   VARCHAR(50)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT ck_users_email_not_blank CHECK (LENGTH(TRIM(email)) > 0),
    CONSTRAINT ck_users_full_name_not_blank CHECK (LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT ck_users_username_not_blank CHECK (LENGTH(TRIM(username)) > 0)
);

CREATE TABLE IF NOT EXISTS prism_user_preferences_l
(
    user_id                     UUID PRIMARY KEY REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    theme                       VARCHAR(20) NOT NULL DEFAULT 'system',
    locale                      VARCHAR(20) NOT NULL DEFAULT 'en-US',
    timezone                    VARCHAR(64) NOT NULL DEFAULT 'UTC',
    email_notifications_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_user_preferences_theme CHECK (theme IN ('system', 'light', 'dark')),
    CONSTRAINT ck_user_preferences_locale_not_blank CHECK (LENGTH(TRIM(locale)) > 0),
    CONSTRAINT ck_user_preferences_timezone_not_blank CHECK (LENGTH(TRIM(timezone)) > 0)
);

CREATE TABLE IF NOT EXISTS prism_user_auths_l
(
    auth_id          UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    provider         VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email            VARCHAR(320) NOT NULL,
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    password_hash    TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_auths_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT uq_user_auths_user_provider UNIQUE (user_id, provider),
    CONSTRAINT ck_user_auths_provider CHECK (provider IN ('email', 'google', 'github')),
    CONSTRAINT ck_user_auths_password_policy CHECK (
        (provider = 'email' AND password_hash IS NOT NULL)
            OR (provider <> 'email' AND password_hash IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_user_auths_email
    ON prism_user_auths_l (email);

CREATE TABLE IF NOT EXISTS prism_refresh_tokens_l
(
    refresh_token_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    refresh_token_hash TEXT        NOT NULL,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON prism_refresh_tokens_l (user_id);

CREATE TABLE IF NOT EXISTS prism_email_tokens_l
(
    email_token_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    auth_id          UUID        NOT NULL REFERENCES prism_user_auths_l (auth_id) ON DELETE CASCADE,
    email_token_hash TEXT        NOT NULL,
    expires_at       TIMESTAMPTZ,
    used_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_auth_id
    ON prism_email_tokens_l (auth_id);

CREATE TABLE IF NOT EXISTS prism_password_reset_tokens_l
(
    password_reset_token_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    auth_id                   UUID        NOT NULL REFERENCES prism_user_auths_l (auth_id) ON DELETE CASCADE,
    password_reset_token_hash TEXT        NOT NULL,
    expires_at                TIMESTAMPTZ NOT NULL,
    used_at                   TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (password_reset_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_auth_id
    ON prism_password_reset_tokens_l (auth_id);

-- =========================================================
-- Service Accounts / API Tokens
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_service_accounts_m
(
    service_account_id UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    name               VARCHAR(80) NOT NULL,
    description        VARCHAR(1000),
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_service_accounts_name UNIQUE (name),
    CONSTRAINT ck_service_accounts_name_not_blank CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_service_accounts_active
    ON prism_service_accounts_m (is_active);

CREATE TABLE IF NOT EXISTS prism_service_api_tokens_l
(
    api_token_id       UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    service_account_id UUID        NOT NULL REFERENCES prism_service_accounts_m (service_account_id) ON DELETE CASCADE,
    name               VARCHAR(80) NOT NULL,
    token_prefix       VARCHAR(64) NOT NULL,
    token_hash         TEXT        NOT NULL,
    scopes             TEXT[]      NOT NULL DEFAULT ARRAY []::TEXT[],
    expires_at         TIMESTAMPTZ NOT NULL,
    last_used_at       TIMESTAMPTZ,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_service_api_tokens_prefix UNIQUE (token_prefix),
    CONSTRAINT ck_service_api_tokens_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT ck_service_api_tokens_prefix_not_blank CHECK (LENGTH(TRIM(token_prefix)) > 0),
    CONSTRAINT ck_service_api_tokens_scopes_not_null CHECK (array_position(scopes, NULL::TEXT) IS NULL),
    CONSTRAINT ck_service_api_tokens_scopes_not_blank CHECK (array_position(scopes, '') IS NULL),
    CONSTRAINT ck_service_api_tokens_expires_after_created CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_service_api_tokens_service_account_id
    ON prism_service_api_tokens_l (service_account_id);

CREATE INDEX IF NOT EXISTS idx_service_api_tokens_active
    ON prism_service_api_tokens_l (service_account_id, expires_at)
    WHERE revoked_at IS NULL;

-- =========================================================
-- Workspaces / Members / Jobs
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_workspaces_l
(
    workspace_id UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    owner_id     UUID        NOT NULL REFERENCES prism_users_l (user_id),
    name         VARCHAR(50) NOT NULL,
    slug         VARCHAR(60) NOT NULL,
    description  VARCHAR(1000),
    timezone     VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale       VARCHAR(20) NOT NULL DEFAULT 'en-US',
    status       VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,

    CONSTRAINT uq_workspaces_slug UNIQUE (slug),
    CONSTRAINT ck_workspaces_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT ck_workspaces_slug_not_blank CHECK (LENGTH(TRIM(slug)) > 0),
    CONSTRAINT ck_workspaces_status CHECK (status IN ('active', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id
    ON prism_workspaces_l (owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_status
    ON prism_workspaces_l (status);

CREATE TABLE IF NOT EXISTS prism_workspace_members_l
(
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT ck_workspace_members_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON prism_workspace_members_l (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
    ON prism_workspace_members_l (role);

CREATE TABLE IF NOT EXISTS prism_workspace_invitations_l
(
    invitation_id    UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    workspace_id     UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    sender_id        UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    receiver_id      UUID REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    receiver_email   VARCHAR(320) NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'member',
    invitation_token UUID         NOT NULL,
    expires_at       TIMESTAMPTZ  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_workspace_invitation_token UNIQUE (invitation_token),
    CONSTRAINT uq_workspace_invitation_email UNIQUE (workspace_id, receiver_email),
    CONSTRAINT ck_workspace_invitations_role CHECK (role IN ('admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_receiver_user_id
    ON prism_workspace_invitations_l (receiver_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_pending_invitation_receiver
    ON prism_workspace_invitations_l (workspace_id, receiver_id)
    WHERE receiver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS prism_workspace_invitation_events_l
(
    event_id      UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    invitation_id UUID        NOT NULL REFERENCES prism_workspace_invitations_l (invitation_id) ON DELETE CASCADE,
    actor_id      UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    event_type    VARCHAR(30) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_workspace_invitation_events_type CHECK (event_type IN ('sent', 'accepted', 'denied', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitation_events_invitation_id
    ON prism_workspace_invitation_events_l (invitation_id);

CREATE TABLE IF NOT EXISTS prism_jobs_l
(
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    job_id       UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    name         VARCHAR(50) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_jobs_workspace_name UNIQUE (workspace_id, name),
    CONSTRAINT uq_jobs_workspace_job UNIQUE (workspace_id, job_id),
    CONSTRAINT ck_jobs_name_not_blank CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id
    ON prism_jobs_l (workspace_id);

CREATE TABLE IF NOT EXISTS prism_workspace_member_job_map
(
    workspace_id UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    job_id       UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id, job_id),

    CONSTRAINT fk_workspace_member_job_map_member
        FOREIGN KEY (workspace_id, user_id)
            REFERENCES prism_workspace_members_l (workspace_id, user_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_workspace_member_job_map_job
        FOREIGN KEY (workspace_id, job_id)
            REFERENCES prism_jobs_l (workspace_id, job_id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_member_job_map_job
    ON prism_workspace_member_job_map (workspace_id, job_id);

CREATE INDEX IF NOT EXISTS idx_workspace_member_job_map_user
    ON prism_workspace_member_job_map (user_id);

-- =========================================================
-- Projects
-- Project = feature / initiative / context boundary.
-- No project members. Workspace members share projects.
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_projects_l
(
    project_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    name         VARCHAR(50) NOT NULL,
    slug         VARCHAR(60) NOT NULL,
    description  VARCHAR(1000),
    status       VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by   UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at  TIMESTAMPTZ,

    CONSTRAINT uq_projects_workspace_slug UNIQUE (workspace_id, slug),
    CONSTRAINT uq_projects_workspace_project UNIQUE (workspace_id, project_id),
    CONSTRAINT ck_projects_name_not_blank CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT ck_projects_slug_not_blank CHECK (LENGTH(TRIM(slug)) > 0),
    CONSTRAINT ck_projects_status CHECK (
        status IN ('planning', 'active', 'maintenance', 'completed', 'archived')
        ),
    CONSTRAINT ck_projects_archived_status CHECK (
        (status = 'archived' AND archived_at IS NOT NULL)
            OR (status <> 'archived')
        )
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_id
    ON prism_projects_l (workspace_id);

CREATE INDEX IF NOT EXISTS idx_projects_workspace_status
    ON prism_projects_l (workspace_id, status);

-- =========================================================
-- WorkItems
-- No type column.
-- Two-level hierarchy only:
--   parent_id IS NULL     => task-level work item
--   parent_id IS NOT NULL => subtask-level work item
-- Parent-child = containment only.
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_work_items_l
(
    item_id           UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    workspace_id      UUID         NOT NULL,
    project_id        UUID         NOT NULL,
    parent_id         UUID,
    title             VARCHAR(100) NOT NULL,
    description       TEXT,
    priority          VARCHAR(10)  NOT NULL DEFAULT 'medium',
    status            VARCHAR(20)  NOT NULL DEFAULT 'todo',
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    created_by        UUID         REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    status_changed_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    archived_at       TIMESTAMPTZ,

    CONSTRAINT uq_work_items_workspace_item UNIQUE (workspace_id, item_id),
    CONSTRAINT uq_work_items_project_item UNIQUE (project_id, item_id),
    CONSTRAINT uq_work_items_workspace_project_item UNIQUE (workspace_id, project_id, item_id),

    CONSTRAINT fk_work_items_project_workspace
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_work_items_parent
        FOREIGN KEY (workspace_id, parent_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE CASCADE,

    CONSTRAINT ck_work_items_parent_self CHECK (parent_id IS NULL OR parent_id <> item_id),
    CONSTRAINT ck_work_items_title_not_blank CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT ck_work_items_status CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'archived')),
    CONSTRAINT ck_work_items_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT ck_work_items_archived_status CHECK (
        (status = 'archived' AND archived_at IS NOT NULL)
            OR (status <> 'archived')
        )
);

CREATE INDEX IF NOT EXISTS idx_work_items_workspace_project
    ON prism_work_items_l (workspace_id, project_id);

CREATE INDEX IF NOT EXISTS idx_work_items_project_parent
    ON prism_work_items_l (project_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_work_items_workspace_status
    ON prism_work_items_l (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_work_items_project_status
    ON prism_work_items_l (project_id, status);

CREATE INDEX IF NOT EXISTS idx_work_items_parent_id
    ON prism_work_items_l (parent_id);

CREATE OR REPLACE FUNCTION prism_enforce_work_item_depth()
    RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (SELECT 1
                   FROM prism_work_items_l parent
                   WHERE parent.workspace_id = NEW.workspace_id
                     AND parent.item_id = NEW.parent_id
                     AND parent.parent_id IS NOT NULL) THEN
            RAISE EXCEPTION 'WorkItem hierarchy can only be two levels deep';
        END IF;
    END IF;

    IF EXISTS (SELECT 1
               FROM prism_work_items_l child
               WHERE child.workspace_id = NEW.workspace_id
                 AND child.parent_id = NEW.item_id
                 AND NEW.parent_id IS NOT NULL) THEN
        RAISE EXCEPTION 'A WorkItem with children cannot become a subtask';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_work_item_depth
    BEFORE INSERT OR UPDATE OF workspace_id, parent_id
    ON prism_work_items_l
    FOR EACH ROW
EXECUTE FUNCTION prism_enforce_work_item_depth();

-- =========================================================
-- WorkItem Relations
-- Dependency/reference graph.
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_work_item_dependencies_l
(
    dependency_id      UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id       UUID        NOT NULL,
    item_id            UUID        NOT NULL,
    depends_on_item_id UUID        NOT NULL,
    created_by         UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_work_item_dependencies_item
        FOREIGN KEY (workspace_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_work_item_dependencies_depends_on_item
        FOREIGN KEY (workspace_id, depends_on_item_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE CASCADE,

    CONSTRAINT uq_work_item_dependency UNIQUE (workspace_id, item_id, depends_on_item_id),
    CONSTRAINT ck_work_item_dependencies_not_self CHECK (item_id <> depends_on_item_id)
);

CREATE INDEX IF NOT EXISTS idx_work_item_dependencies_item
    ON prism_work_item_dependencies_l (workspace_id, item_id);

CREATE INDEX IF NOT EXISTS idx_work_item_dependencies_depends_on_item
    ON prism_work_item_dependencies_l (workspace_id, depends_on_item_id);

-- =========================================================
-- Sprints
-- Workspace-level team timebox.
-- Can contain WorkItems from multiple Projects in the same Workspace.
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_sprints_l
(
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    sprint_id    UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    sprint_name  VARCHAR(50) NOT NULL,
    goal         TEXT,
    starts_at    TIMESTAMPTZ NOT NULL,
    ends_at      TIMESTAMPTZ NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'planned',
    created_by   UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at    TIMESTAMPTZ,

    CONSTRAINT uq_sprints_workspace_name UNIQUE (workspace_id, sprint_name),
    CONSTRAINT uq_sprints_workspace_sprint UNIQUE (workspace_id, sprint_id),
    CONSTRAINT ck_sprints_name_not_blank CHECK (LENGTH(TRIM(sprint_name)) > 0),
    CONSTRAINT ck_sprints_period CHECK (starts_at < ends_at),
    CONSTRAINT ck_sprints_status CHECK (status IN ('planned', 'active', 'closed', 'cancelled')),
    CONSTRAINT ck_sprints_closed_status CHECK (
        (status = 'closed' AND closed_at IS NOT NULL)
            OR (status <> 'closed')
        )
);

CREATE INDEX IF NOT EXISTS idx_sprints_workspace_status
    ON prism_sprints_l (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_sprints_workspace_period
    ON prism_sprints_l (workspace_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS prism_sprint_work_item_map
(
    workspace_id UUID        NOT NULL,
    sprint_id    UUID        NOT NULL,
    project_id   UUID        NOT NULL,
    item_id      UUID        NOT NULL,
    added_by     UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (sprint_id, item_id),

    CONSTRAINT fk_sprint_work_item_map_sprint
        FOREIGN KEY (workspace_id, sprint_id)
            REFERENCES prism_sprints_l (workspace_id, sprint_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_sprint_work_item_map_item
        FOREIGN KEY (workspace_id, project_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, project_id, item_id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sprint_work_item_map_workspace_sprint
    ON prism_sprint_work_item_map (workspace_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_sprint_work_item_map_project
    ON prism_sprint_work_item_map (workspace_id, project_id);

CREATE INDEX IF NOT EXISTS idx_sprint_work_item_map_item
    ON prism_sprint_work_item_map (workspace_id, item_id);

-- =========================================================
-- WorkItem Assignment / Labels / Comments
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_work_item_member_map
(
    workspace_id UUID        NOT NULL,
    item_id      UUID        NOT NULL,
    user_id      UUID        NOT NULL,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by  UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,

    PRIMARY KEY (item_id, user_id),

    CONSTRAINT fk_work_item_member_map_item
        FOREIGN KEY (workspace_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_work_item_member_map_member
        FOREIGN KEY (workspace_id, user_id)
            REFERENCES prism_workspace_members_l (workspace_id, user_id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_item_member_map_user
    ON prism_work_item_member_map (user_id);

CREATE INDEX IF NOT EXISTS idx_work_item_member_map_workspace_user
    ON prism_work_item_member_map (workspace_id, user_id);

CREATE TABLE IF NOT EXISTS prism_work_item_labels_l
(
    label_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    project_id UUID        NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    label      VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_work_item_labels_project_label UNIQUE (project_id, label),
    CONSTRAINT uq_work_item_labels_project_label_id UNIQUE (project_id, label_id),
    CONSTRAINT ck_work_item_labels_label_not_blank CHECK (LENGTH(TRIM(label)) > 0)
);

CREATE TABLE IF NOT EXISTS prism_work_item_label_map
(
    project_id UUID        NOT NULL,
    item_id    UUID        NOT NULL,
    label_id   UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (item_id, label_id),

    CONSTRAINT fk_work_item_label_map_item
        FOREIGN KEY (project_id, item_id)
            REFERENCES prism_work_items_l (project_id, item_id)
            ON DELETE CASCADE,

    CONSTRAINT fk_work_item_label_map_label
        FOREIGN KEY (project_id, label_id)
            REFERENCES prism_work_item_labels_l (project_id, label_id)
            ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_item_label_map_project_label
    ON prism_work_item_label_map (project_id, label_id);

CREATE TABLE IF NOT EXISTS prism_work_item_comments_l
(
    comment_id     UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id   UUID        NOT NULL,
    item_id        UUID        NOT NULL,
    author_user_id UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE RESTRICT,
    body           TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ,

    CONSTRAINT fk_work_item_comments_item
        FOREIGN KEY (workspace_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE CASCADE,
    CONSTRAINT ck_work_item_comments_body_not_blank CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_work_item_comments_item_created
    ON prism_work_item_comments_l (workspace_id, item_id, created_at, comment_id);

CREATE INDEX IF NOT EXISTS idx_work_item_comments_author_user_id
    ON prism_work_item_comments_l (author_user_id);

-- =========================================================
-- Documents
-- Project-scoped context documents.
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_documents_l
(
    document_id         UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    workspace_id        UUID         NOT NULL,
    project_id          UUID         NOT NULL,
    title               VARCHAR(100) NOT NULL,
    description         VARCHAR(1000),
    file_name           VARCHAR(255) NOT NULL,
    content_type        VARCHAR(255) NOT NULL,
    size_bytes          BIGINT       NOT NULL,
    storage_object_name TEXT         NOT NULL,
    storage_etag        VARCHAR(255),
    storage_version_id  VARCHAR(255),
    created_by          UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE RESTRICT,
    updated_by          UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_documents_project
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
    CONSTRAINT uq_documents_project_document UNIQUE (project_id, document_id),
    CONSTRAINT uq_documents_storage_object_name UNIQUE (storage_object_name),
    CONSTRAINT ck_documents_title_not_blank CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT ck_documents_size_bytes_positive CHECK (size_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_project_created_at
    ON prism_documents_l (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_workspace_project
    ON prism_documents_l (workspace_id, project_id);

-- =========================================================
-- Agent Runs / Actions / Memory
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_agent_runs_l
(
    run_id                UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id          UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id            UUID        NOT NULL,
    triggered_by_user_id  UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    work_item_id          UUID,
    parent_run_id         UUID REFERENCES prism_agent_runs_l (run_id) ON DELETE CASCADE,
    agent_type            VARCHAR(50) NOT NULL,
    trigger_type          VARCHAR(30) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'queued',
    objective             TEXT        NOT NULL,
    system_prompt_version VARCHAR(100),
    started_at            TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_runs_project
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
    CONSTRAINT fk_agent_runs_work_item
        FOREIGN KEY (workspace_id, work_item_id)
            REFERENCES prism_work_items_l (workspace_id, item_id)
            ON DELETE SET NULL,
    CONSTRAINT ck_agent_runs_trigger_type CHECK (
        trigger_type IN ('manual', 'event', 'scheduled', 'webhook', 'recursive')
        ),
    CONSTRAINT ck_agent_runs_status CHECK (
        status IN ('queued', 'running', 'waiting', 'completed', 'failed', 'cancelled')
        ),
    CONSTRAINT ck_agent_runs_objective_not_blank CHECK (LENGTH(TRIM(objective)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_project_status
    ON prism_agent_runs_l (project_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace_status
    ON prism_agent_runs_l (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_work_item
    ON prism_agent_runs_l (workspace_id, work_item_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_parent
    ON prism_agent_runs_l (parent_run_id);

CREATE TABLE IF NOT EXISTS prism_agent_steps_l
(
    step_id            UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    run_id             UUID         NOT NULL REFERENCES prism_agent_runs_l (run_id) ON DELETE CASCADE,
    step_order         INT          NOT NULL,
    step_type          VARCHAR(30)  NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
    title              VARCHAR(100) NOT NULL,
    input_object_name  TEXT,
    output_object_name TEXT,
    input_summary      TEXT,
    output_summary     TEXT,
    error_message      TEXT,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_agent_steps_run_order UNIQUE (run_id, step_order),
    CONSTRAINT ck_agent_steps_title_not_blank CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT ck_agent_steps_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped'))
);

CREATE TABLE IF NOT EXISTS prism_agent_actions_l
(
    action_id           UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    run_id              UUID        NOT NULL REFERENCES prism_agent_runs_l (run_id) ON DELETE CASCADE,
    step_id             UUID        REFERENCES prism_agent_steps_l (step_id) ON DELETE SET NULL,
    workspace_id        UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id          UUID        NOT NULL,
    action_type         VARCHAR(50) NOT NULL,
    target_type         VARCHAR(50) NOT NULL,
    target_id           UUID,
    status              VARCHAR(20) NOT NULL DEFAULT 'proposed',
    reasoning_summary   TEXT,
    payload_object_name TEXT,
    result_object_name  TEXT,
    requires_approval   BOOLEAN     NOT NULL DEFAULT TRUE,
    approved_by_user_id UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ,
    executed_at         TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_actions_project
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
    CONSTRAINT ck_agent_actions_status CHECK (status IN
                                              ('proposed', 'approved', 'rejected', 'executed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_run
    ON prism_agent_actions_l (run_id);

CREATE INDEX IF NOT EXISTS idx_agent_actions_project_status
    ON prism_agent_actions_l (project_id, status);

CREATE TABLE IF NOT EXISTS prism_agent_action_events_l
(
    event_id          UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    action_id         UUID        NOT NULL REFERENCES prism_agent_actions_l (action_id) ON DELETE CASCADE,
    actor_user_id     UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    event_type        VARCHAR(30) NOT NULL,
    message           TEXT,
    event_object_name TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_events_action
    ON prism_agent_action_events_l (action_id, created_at);

CREATE TABLE IF NOT EXISTS prism_agent_memories_l
(
    memory_id    UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL,
    project_id   UUID        NOT NULL,
    run_id       UUID        REFERENCES prism_agent_runs_l (run_id) ON DELETE SET NULL,
    step_id      UUID        REFERENCES prism_agent_steps_l (step_id) ON DELETE SET NULL,
    memory_type  VARCHAR(40) NOT NULL,
    title        VARCHAR(100),
    content      TEXT        NOT NULL,
    content_hash TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_memories_project
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id)
            ON DELETE CASCADE,
    CONSTRAINT ck_agent_memories_memory_type CHECK (
        memory_type IN
        ('agent_decision', 'agent_summary', 'agent_plan', 'agent_result', 'project_fact', 'user_preference')
        ),
    CONSTRAINT ck_agent_memories_content_not_blank CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_project_type
    ON prism_agent_memories_l (project_id, memory_type);

CREATE INDEX IF NOT EXISTS idx_agent_memories_workspace_type
    ON prism_agent_memories_l (workspace_id, memory_type);

-- =========================================================
-- Embeddings / Chunking
-- =========================================================

CREATE TABLE IF NOT EXISTS prism_document_chunks_l
(
    chunk_id     UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    document_id  UUID        NOT NULL REFERENCES prism_documents_l (document_id) ON DELETE CASCADE,
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id   UUID        NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    chunk_index  INT         NOT NULL,
    heading_path TEXT[],
    content      TEXT        NOT NULL,
    content_hash TEXT        NOT NULL,
    token_count  INT,
    char_count   INT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_document_chunks_index UNIQUE (document_id, chunk_index),
    CONSTRAINT uq_document_chunks_hash UNIQUE (document_id, content_hash),
    CONSTRAINT ck_document_chunks_content_not_blank CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_project
    ON prism_document_chunks_l (project_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document
    ON prism_document_chunks_l (document_id, chunk_index);

CREATE TABLE IF NOT EXISTS prism_document_chunk_embeddings_l
(
    chunk_id     UUID PRIMARY KEY REFERENCES prism_document_chunks_l (chunk_id) ON DELETE CASCADE,
    workspace_id UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id   UUID         NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    embedding    vector(1536) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    dimensions   INT          NOT NULL DEFAULT 1536,
    content_hash TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    embedded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_document_chunk_embeddings_dimensions CHECK (dimensions = 1536)
);

CREATE INDEX IF NOT EXISTS idx_document_chunk_embeddings_project
    ON prism_document_chunk_embeddings_l (project_id);

CREATE INDEX IF NOT EXISTS idx_document_chunk_embeddings_vector_hnsw
    ON prism_document_chunk_embeddings_l
        USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS prism_work_item_embeddings_l
(
    item_id              UUID PRIMARY KEY,
    workspace_id         UUID         NOT NULL,
    project_id           UUID         NOT NULL,
    embedding            vector(1536) NOT NULL,
    embedded_title       TEXT         NOT NULL,
    embedded_description TEXT         NOT NULL,
    content_hash         TEXT         NOT NULL,
    model                VARCHAR(100) NOT NULL,
    dimensions           INT          NOT NULL DEFAULT 1536,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    embedded_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_work_item_embeddings_item
        FOREIGN KEY (workspace_id, project_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, project_id, item_id)
            ON DELETE CASCADE,
    CONSTRAINT ck_work_item_embeddings_dimensions CHECK (dimensions = 1536)
);

CREATE INDEX IF NOT EXISTS idx_work_item_embeddings_project
    ON prism_work_item_embeddings_l (project_id);

CREATE INDEX IF NOT EXISTS idx_work_item_embeddings_vector_hnsw
    ON prism_work_item_embeddings_l
        USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS prism_work_item_comment_embeddings_l
(
    comment_id    UUID PRIMARY KEY REFERENCES prism_work_item_comments_l (comment_id) ON DELETE CASCADE,
    workspace_id  UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id    UUID         NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    item_id       UUID         NOT NULL,
    embedding     vector(1536) NOT NULL,
    embedded_body TEXT         NOT NULL,
    content_hash  TEXT         NOT NULL,
    model         VARCHAR(100) NOT NULL,
    dimensions    INT          NOT NULL DEFAULT 1536,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    embedded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comment_embeddings_item
        FOREIGN KEY (workspace_id, project_id, item_id)
            REFERENCES prism_work_items_l (workspace_id, project_id, item_id)
            ON DELETE CASCADE,
    CONSTRAINT ck_comment_embeddings_dimensions CHECK (dimensions = 1536)
);

CREATE INDEX IF NOT EXISTS idx_comment_embeddings_item
    ON prism_work_item_comment_embeddings_l (workspace_id, item_id);

CREATE INDEX IF NOT EXISTS idx_comment_embeddings_project
    ON prism_work_item_comment_embeddings_l (project_id);

CREATE INDEX IF NOT EXISTS idx_comment_embeddings_vector_hnsw
    ON prism_work_item_comment_embeddings_l
        USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS prism_agent_memory_embeddings_l
(
    memory_id    UUID PRIMARY KEY REFERENCES prism_agent_memories_l (memory_id) ON DELETE CASCADE,
    workspace_id UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id   UUID         NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    embedding    vector(1536) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    dimensions   INT          NOT NULL DEFAULT 1536,
    content_hash TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    embedded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_agent_memory_embeddings_dimensions CHECK (dimensions = 1536)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_embeddings_project
    ON prism_agent_memory_embeddings_l (project_id);

CREATE INDEX IF NOT EXISTS idx_agent_memory_embeddings_vector_hnsw
    ON prism_agent_memory_embeddings_l
        USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS prism_embedding_jobs_l
(
    embedding_job_id UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    workspace_id     UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    project_id       UUID         NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    job_type         VARCHAR(40)  NOT NULL,
    target_id        UUID         NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'queued',
    model            VARCHAR(100) NOT NULL,
    dimensions       INT          NOT NULL DEFAULT 1536,
    content_hash     TEXT,
    object_name      TEXT,
    attempts         INT          NOT NULL DEFAULT 0,
    max_attempts     INT          NOT NULL DEFAULT 3,
    error_message    TEXT,
    scheduled_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_embedding_jobs_type CHECK (
        job_type IN ('document', 'document_chunk', 'work_item', 'work_item_comment', 'agent_memory')
        ),
    CONSTRAINT ck_embedding_jobs_status CHECK (
        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
        ),
    CONSTRAINT ck_embedding_jobs_dimensions CHECK (dimensions = 1536),
    CONSTRAINT ck_embedding_jobs_attempts CHECK (attempts >= 0 AND max_attempts > 0)
);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status_scheduled
    ON prism_embedding_jobs_l (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_project_type
    ON prism_embedding_jobs_l (project_id, job_type);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_workspace_status
    ON prism_embedding_jobs_l (workspace_id, status);
