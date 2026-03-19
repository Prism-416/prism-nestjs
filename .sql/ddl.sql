CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prism_users_l
(
    user_id      UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    email        VARCHAR(320) NOT NULL,
    full_name    VARCHAR(100) NOT NULL,
    display_name VARCHAR(50)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS prism_user_auths_l
(
    auth_id          UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    provider         VARCHAR(20)  NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email            VARCHAR(320) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_user_auths_user_id
    ON prism_user_auths_l (user_id);

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

CREATE TABLE IF NOT EXISTS prism_workspaces_l
(
    workspace_id   UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    owner_user_id  UUID         NOT NULL REFERENCES prism_users_l (user_id),
    name           VARCHAR(100) NOT NULL,
    slug           VARCHAR(60)  NOT NULL,
    description    TEXT,
    timezone       VARCHAR(50)  NOT NULL DEFAULT 'UTC',
    locale         VARCHAR(20)  NOT NULL DEFAULT 'en-US',
    status         VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    archived_at    TIMESTAMPTZ,
    UNIQUE (slug),
    CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id
    ON prism_workspaces_l (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_status
    ON prism_workspaces_l (status);

CREATE TABLE IF NOT EXISTS prism_workspace_members_l
(
    workspace_member_id UUID PRIMARY KEY      DEFAULT gen_random_uuid(),
    workspace_id        UUID         NOT NULL REFERENCES prism_workspaces_l (workspace_id) ON DELETE CASCADE,
    user_id             UUID         NOT NULL REFERENCES prism_users_l (user_id) ON DELETE CASCADE,
    role                VARCHAR(20)  NOT NULL,
    joined_at           TIMESTAMPTZ,
    invited_by          UUID REFERENCES prism_users_l (user_id),
    invited_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    archived_at         TIMESTAMPTZ,
    UNIQUE (workspace_id, user_id),
    CHECK (role IN ('admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
    ON prism_workspace_members_l (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
    ON prism_workspace_members_l (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
    ON prism_workspace_members_l (role);
