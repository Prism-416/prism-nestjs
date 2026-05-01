CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prism_users_l
(
    user_id    UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email      VARCHAR(320) NOT NULL,
    full_name  VARCHAR(100) NOT NULL,
    username   VARCHAR(50)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (email),
    UNIQUE (username)
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
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider),
    CHECK (provider IN ('email', 'google', 'github')),
    CHECK (
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

CREATE TABLE IF NOT EXISTS prism_workspaces_l
(
    workspace_id UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    owner_id     UUID        NOT NULL REFERENCES prism_users_l (user_id),
    name         VARCHAR(20) NOT NULL,
    slug         VARCHAR(30) NOT NULL,
    description  VARCHAR(1000),
    timezone     VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale       VARCHAR(20) NOT NULL DEFAULT 'en-US',
    status       VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_workspaces_slug UNIQUE (slug),
    CHECK (status IN ('active', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id
    ON prism_workspaces_l (owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_status
    ON prism_workspaces_l (status);

CREATE TABLE IF NOT EXISTS prism_workspace_members_l
(
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL,
    joined_at    TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, user_id),
    CHECK (role IN ('admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON prism_workspace_members_l (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
    ON prism_workspace_members_l (role);

CREATE TABLE IF NOT EXISTS prism_workspace_invitations_l
(
    invitation_id    UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id     UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    sender_id        UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    receiver_id      UUID        REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    receiver_email   VARCHAR(320) NOT NULL,
    role             VARCHAR(20) NOT NULL,
    invitation_token UUID        NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (invitation_token),
    UNIQUE (workspace_id, receiver_email),
    CHECK (role IN ('admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_receiver_user_id
    ON prism_workspace_invitations_l (receiver_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_pending_invitation_receiver
    ON prism_workspace_invitations_l (workspace_id, receiver_id);

CREATE TABLE IF NOT EXISTS prism_workspace_invitation_events_l
(
    event_id      UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    invitation_id UUID        NOT NULL REFERENCES prism_workspace_invitations_l (invitation_id) ON DELETE CASCADE,
    actor_id      UUID        REFERENCES prism_users_l (user_id) ON DELETE SET NULL,
    event_type    VARCHAR(30) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (event_type IN ('sent', 'accepted', 'denied'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitation_events_invitation_id
    ON prism_workspace_invitation_events_l (invitation_id);

CREATE TABLE IF NOT EXISTS prism_projects_l
(
    project_id   UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    name         VARCHAR(20) NOT NULL,
    slug         VARCHAR(30) NOT NULL,
    description  VARCHAR(1000),
    timezone     VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale       VARCHAR(20) NOT NULL DEFAULT 'en-US',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_projects_workspace_slug UNIQUE (workspace_id, slug),
    CONSTRAINT uq_projects_workspace_project UNIQUE (workspace_id, project_id)
);

CREATE TABLE IF NOT EXISTS prism_project_members_l
(
    member_id    UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL,
    project_id   UUID        NOT NULL,
    user_id      UUID        NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_members_project_user UNIQUE (project_id, user_id),
    CONSTRAINT uq_project_members_project_member UNIQUE (project_id, member_id),
    CONSTRAINT uq_project_members_workspace_member UNIQUE (workspace_id, member_id),
    CONSTRAINT fk_project_members_project_workspace
        FOREIGN KEY (workspace_id, project_id)
            REFERENCES prism_projects_l (workspace_id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id
    ON prism_project_members_l (user_id);

CREATE TABLE IF NOT EXISTS prism_project_jobs_l
(
    workspace_id UUID        NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    job_id       UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    name         VARCHAR(20) NOT NULL,
    description  TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_jobs_workspace_name UNIQUE (workspace_id, name),
    CONSTRAINT uq_project_jobs_workspace_job UNIQUE (workspace_id, job_id)
);

CREATE TABLE IF NOT EXISTS prism_project_member_job_map
(
    job_id     UUID        NOT NULL,
    member_id  UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (job_id, member_id),
    CONSTRAINT fk_project_member_job_map_job
        FOREIGN KEY (job_id)
            REFERENCES prism_project_jobs_l (job_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_member_job_map_member
        FOREIGN KEY (member_id)
            REFERENCES prism_project_members_l (member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_member_job_map_member_id
    ON prism_project_member_job_map (member_id);

CREATE TABLE IF NOT EXISTS prism_work_items_l
(
    item_id            UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    project_id         UUID        NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    parent_id          UUID,
    title              VARCHAR(50) NOT NULL,
    description        TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type               VARCHAR(5)  NOT NULL,
    priority           VARCHAR(10) NOT NULL,
    status             VARCHAR(20) NOT NULL,
    status_changed_at TIMESTAMPTZ,
    CONSTRAINT uq_work_items_project_item UNIQUE (project_id, item_id),
    CONSTRAINT fk_work_items_parent
        FOREIGN KEY (project_id, parent_id)
            REFERENCES prism_work_items_l (project_id, item_id) ON DELETE CASCADE,
    CONSTRAINT ck_work_items_parent_self
        CHECK (parent_id IS NULL OR parent_id <> item_id),
    CHECK (type IN ('epic', 'story', 'task')),
    CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_work_items_project_parent_id
    ON prism_work_items_l (project_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_work_items_project_status
    ON prism_work_items_l (project_id, status);

CREATE TABLE IF NOT EXISTS prism_work_item_member_map
(
    project_id   UUID        NOT NULL,
    item_id      UUID        NOT NULL,
    member_id    UUID        NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, member_id),
    CONSTRAINT fk_work_item_member_map_item
        FOREIGN KEY (project_id, item_id)
            REFERENCES prism_work_items_l (project_id, item_id) ON DELETE CASCADE,
    CONSTRAINT fk_work_item_member_map_member
        FOREIGN KEY (project_id, member_id)
            REFERENCES prism_project_members_l (project_id, member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_item_member_map_member_id
    ON prism_work_item_member_map (member_id);

CREATE TABLE IF NOT EXISTS prism_work_item_labels_l
(
    label_id    UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    project_id  UUID        NOT NULL REFERENCES prism_projects_l (project_id) ON DELETE CASCADE,
    label       VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_item_labels_project_label UNIQUE (project_id, label),
    CONSTRAINT uq_work_item_labels_project_label_id UNIQUE (project_id, label_id)
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
            REFERENCES prism_work_items_l (project_id, item_id) ON DELETE CASCADE,
    CONSTRAINT fk_work_item_label_map_label
        FOREIGN KEY (project_id, label_id)
            REFERENCES prism_work_item_labels_l (project_id, label_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_item_label_map_project_label_id
    ON prism_work_item_label_map (project_id, label_id);
