import { DomainError, NotExistsError } from '@/core/errors';

export class GithubInstallationStateError extends DomainError {
  constructor() {
    super(
      'Invalid or expired GitHub installation state.',
      'INVALID_GITHUB_INSTALLATION_STATE',
      400,
    );
  }
}

export class GithubInstallationNotFoundError extends NotExistsError {
  constructor() {
    super('GitHub installation not found.', 'GITHUB_INSTALLATION_NOT_FOUND');
  }
}

export class GithubRepositoryNotFoundError extends NotExistsError {
  constructor() {
    super('GitHub repository not found.', 'GITHUB_REPOSITORY_NOT_FOUND');
  }
}

export class GithubPullRequestNotFoundError extends NotExistsError {
  constructor() {
    super('GitHub pull request not found.', 'GITHUB_PULL_REQUEST_NOT_FOUND');
  }
}
