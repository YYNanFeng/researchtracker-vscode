import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ResearchData, Idea, Experiment, Result, Reference, LogEntry, ProjectInfo } from './types';
import { mockData, mockFileContents } from '../mock/data';
import { EventEmitter } from 'events';

/** 将 gray-matter 解析出的 Date 对象转换为 "YYYY-MM-DD" 字符串 */
function deepConvertDates(obj: unknown): unknown {
  if (obj instanceof Date) {
    return obj.toISOString().split('T')[0];
  }
  if (Array.isArray(obj)) {
    return obj.map(deepConvertDates);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = deepConvertDates(value);
    }
    return result;
  }
  return obj;
}

/** 解析 frontmatter 并确保日期字段为字符串类型 */
function parseMatter(content: string): Record<string, unknown> {
  const parsed = matter(content);
  return deepConvertDates(parsed.data) as Record<string, unknown>;
}

export class ResearchScanner extends EventEmitter {
  private rootDir: string;
  private data: ResearchData;
  private useMock: boolean = false;
  private scanning: boolean = false;

  constructor(rootDir: string) {
    super();
    this.rootDir = rootDir;
    this.data = {
      project: null,
      ideas: new Map(),
      experiments: new Map(),
      results: new Map(),
      references: new Map(),
      logs: [],
    };
  }

  get project() { return this.data.project; }
  get ideas() { return this.data.ideas; }
  get experiments() { return this.data.experiments; }
  get results() { return this.data.results; }
  get references() { return this.data.references; }
  get logs() { return this.data.logs; }

  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      if (!fs.existsSync(this.rootDir)) {
        if (!this.useMock) {
          this.useMock = true;
          this.data = {
            project: mockData.project,
            ideas: new Map(mockData.ideas),
            experiments: new Map(mockData.experiments),
            results: new Map(mockData.results),
            references: new Map(mockData.references),
            logs: [...mockData.logs],
          };
        }
        return;
      }

      this.useMock = false;
      this.data = {
        project: null,
        ideas: new Map(),
        experiments: new Map(),
        results: new Map(),
        references: new Map(),
        logs: [],
      };

      await this.scanProject();
      await this.scanIdeas();
      await this.scanRefs();
      await this.scanLogs();
    } finally {
      this.scanning = false;
    }
  }

  private async scanProject(): Promise<void> {
    const readmePath = path.join(this.rootDir, 'README.md');
    if (!fs.existsSync(readmePath)) return;

    const content = fs.readFileSync(readmePath, 'utf-8');
    this.data.project = parseMatter(content) as unknown as ProjectInfo;
  }

  private async scanIdeas(): Promise<void> {
    const ideasDir = path.join(this.rootDir, 'ideas');
    if (!fs.existsSync(ideasDir)) return;

    const ideaDirs = fs.readdirSync(ideasDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const ideaDir of ideaDirs) {
      const readmePath = path.join(ideasDir, ideaDir.name, 'README.md');
      if (!fs.existsSync(readmePath)) continue;

      const content = fs.readFileSync(readmePath, 'utf-8');
      const idea = parseMatter(content) as unknown as Idea;
      this.data.ideas.set(idea.id, idea);

      await this.scanExperiments(path.join(ideasDir, ideaDir.name), idea.id);
    }
  }

  private async scanExperiments(ideaDir: string, ideaId: string): Promise<void> {
    const expDir = path.join(ideaDir, 'experiments');
    if (!fs.existsSync(expDir)) return;

    const expDirs = fs.readdirSync(expDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const expSub of expDirs) {
      const readmePath = path.join(expDir, expSub.name, 'README.md');
      if (!fs.existsSync(readmePath)) continue;

      const content = fs.readFileSync(readmePath, 'utf-8');
      const exp = parseMatter(content) as unknown as Experiment;
      this.data.experiments.set(exp.id, exp);

      const resultPath = path.join(expDir, expSub.name, 'result.md');
      if (fs.existsSync(resultPath)) {
        const resultContent = fs.readFileSync(resultPath, 'utf-8');
        const result = parseMatter(resultContent) as unknown as Result;
        this.data.results.set(result.id, result);
      }
    }
  }

  private async scanRefs(): Promise<void> {
    const refsDir = path.join(this.rootDir, 'refs');
    if (!fs.existsSync(refsDir)) return;

    const files = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(refsDir, file), 'utf-8');
      const ref = parseMatter(content) as unknown as Reference;
      this.data.references.set(ref.key, ref);
    }
  }

  private async scanLogs(): Promise<void> {
    const logsDir = path.join(this.rootDir, 'logs');
    if (!fs.existsSync(logsDir)) return;

    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
      this.data.logs.push(parseMatter(content) as unknown as LogEntry);
    }

    this.data.logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  getFileContent(filePath: string): string | undefined {
    if (this.useMock) {
      return mockFileContents[filePath];
    }
    const fullPath = path.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
    return undefined;
  }

  getExperimentsForIdea(ideaId: string): Experiment[] {
    const result: Experiment[] = [];
    for (const exp of this.data.experiments.values()) {
      if (exp.idea === ideaId) {
        result.push(exp);
      }
    }
    return result.sort((a, b) => a.created.localeCompare(b.created));
  }

  getResultForExperiment(experimentId: string): Result | undefined {
    for (const result of this.data.results.values()) {
      if (result.experiment === experimentId) {
        return result;
      }
    }
    return undefined;
  }

  getTimelineEvents(): Array<{ date: string; type: string; label: string; id: string }> {
    const events: Array<{ date: string; type: string; label: string; id: string }> = [];

    for (const idea of this.data.ideas.values()) {
      events.push({ date: idea.created, type: 'idea', label: `💡 新思路: ${idea.claim.substring(0, 40)}...`, id: idea.id });
    }
    for (const exp of this.data.experiments.values()) {
      events.push({ date: exp.created, type: 'experiment', label: `🧪 新实验: ${exp.id}`, id: exp.id });
    }
    for (const result of this.data.results.values()) {
      events.push({ date: result.created, type: 'result', label: `📊 结果: ${result.claim.substring(0, 40)}...`, id: result.id });
    }
    for (const log of this.data.logs) {
      events.push({ date: log.date, type: 'log', label: `📝 日志: ${log.date}`, id: log.date });
    }

    return events.sort((a, b) => b.date.localeCompare(a.date));
  }
}
