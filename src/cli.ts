import { spawn } from 'child_process';

export class CLIClient {
  private workspaceRoot: string;
  private _available: boolean | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  get available(): boolean | null {
    return this._available;
  }

  async checkAvailable(): Promise<boolean> {
    try {
      await this.exec(['--help'], false);
      this._available = true;
      return true;
    } catch {
      this._available = false;
      return false;
    }
  }

  private async exec(args: string[], expectJson: boolean = true): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('research', args, {
        cwd: this.workspaceRoot,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new CLIError(code ?? 1, stderr.trim() || stdout.trim()));
        }
      });

      proc.on('error', (err) => {
        this._available = false;
        reject(new CLIError(-1, `无法启动 research 命令: ${err.message}`));
      });
    });
  }

  async init(options: { name: string; question: string }): Promise<string> {
    return this.exec([
      'init',
      '--name', options.name,
      '--question', options.question,
    ], false);
  }

  async addIdea(input: {
    title: string;
    claim: string;
    evidence?: string;
    parents?: string;
    confidence?: number;
    tags?: string;
  }): Promise<string> {
    const args = ['idea', 'add', input.title, '--claim', input.claim];
    if (input.evidence) args.push('--evidence', input.evidence);
    if (input.parents) args.push('--parents', input.parents);
    if (input.confidence !== undefined) args.push('--confidence', String(input.confidence));
    if (input.tags) args.push('--tags', input.tags);
    return this.exec(args, false);
  }

  async updateIdea(id: string, options: {
    status?: string;
    confidence?: number;
    evidence?: string;
    evidenceLink?: string;
  }): Promise<string> {
    const args = ['idea', 'update', id];
    if (options.status) args.push('--status', options.status);
    if (options.confidence !== undefined) args.push('--confidence', String(options.confidence));
    if (options.evidence) args.push('--evidence', options.evidence);
    if (options.evidenceLink) args.push('--evidence-link', options.evidenceLink);
    return this.exec(args, false);
  }

  async listIdeas(options?: { status?: string }): Promise<any[]> {
    const args = ['idea', 'list', '--format', 'json'];
    if (options?.status) args.push('--status', options.status);
    const raw = await this.exec(args);
    return JSON.parse(raw);
  }

  async createExperiment(input: {
    title: string;
    idea: string;
    purpose?: string;
    basedOn?: string;
    commits?: string;
    tags?: string;
  }): Promise<string> {
    const args = ['experiment', 'create', input.title, '--idea', input.idea];
    if (input.purpose) args.push('--purpose', input.purpose);
    if (input.basedOn) args.push('--based-on', input.basedOn);
    if (input.commits) args.push('--commits', input.commits);
    if (input.tags) args.push('--tags', input.tags);
    return this.exec(args, false);
  }

  async updateExperiment(id: string, options: {
    status?: string;
    commits?: string;
  }): Promise<string> {
    const args = ['experiment', 'update', id];
    if (options.status) args.push('--status', options.status);
    if (options.commits) args.push('--commits', options.commits);
    return this.exec(args, false);
  }

  async logResult(experimentId: string, options: {
    claim: string;
    evidence: string;
    status: string;
    metrics?: string;
  }): Promise<string> {
    const args = [
      'experiment', 'log-result', experimentId,
      '--claim', options.claim,
      '--evidence', options.evidence,
      '--status', options.status,
    ];
    if (options.metrics) args.push('--metrics', options.metrics);
    return this.exec(args, false);
  }

  async addReference(input: {
    key: string;
    title: string;
    authors: string;
    year: number;
    venue?: string;
    url?: string;
    tags?: string;
  }): Promise<string> {
    const args = [
      'reference', 'add', input.key,
      '--title', input.title,
      '--authors', input.authors,
      '--year', String(input.year),
    ];
    if (input.venue) args.push('--venue', input.venue);
    if (input.url) args.push('--url', input.url);
    if (input.tags) args.push('--tags', input.tags);
    return this.exec(args, false);
  }

  async addLog(content: string): Promise<string> {
    return this.exec(['log', content], false);
  }

  async search(keyword: string): Promise<string> {
    return this.exec(['search', keyword], false);
  }

  async getTimeline(options?: { from?: string; to?: string }): Promise<any[]> {
    const args = ['timeline', '--format', 'json'];
    if (options?.from) args.push('--from', options.from);
    if (options?.to) args.push('--to', options.to);
    const raw = await this.exec(args);
    return JSON.parse(raw);
  }

  async status(): Promise<any> {
    const raw = await this.exec(['status', '--format', 'json']);
    return JSON.parse(raw);
  }
}

export class CLIError extends Error {
  constructor(public readonly exitCode: number, public readonly stderr: string) {
    super(stderr);
    this.name = 'CLIError';
  }
}
