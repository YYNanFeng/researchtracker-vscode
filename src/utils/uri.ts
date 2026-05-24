import * as path from 'path';

export function getIdeaFilePath(rootDir: string, ideaSlug: string): string {
  return path.join(rootDir, 'ideas', ideaSlug, 'README.md');
}

export function getExperimentFilePath(rootDir: string, ideaSlug: string, expId: string): string {
  return path.join(rootDir, 'ideas', ideaSlug, 'experiments', expId, 'README.md');
}

export function getRefFilePath(rootDir: string, key: string): string {
  return path.join(rootDir, 'refs', `${key}.md`);
}

export function getLogFilePath(rootDir: string, date: string): string {
  return path.join(rootDir, 'logs', `${date}.md`);
}

export function ideaIdToSlug(id: string): string {
  return id.replace(/^idea-/, '');
}

export function mockIdeaFilePath(ideaId: string): string {
  const slug = ideaIdToSlug(ideaId);
  return `.research/ideas/${slug}/README.md`;
}

export function mockExperimentFilePath(ideaId: string, expId: string): string {
  const slug = ideaIdToSlug(ideaId);
  return `.research/ideas/${slug}/experiments/${expId}/README.md`;
}

export function mockResultFilePath(ideaId: string, expId: string): string {
  const slug = ideaIdToSlug(ideaId);
  return `.research/ideas/${slug}/experiments/${expId}/result.md`;
}
