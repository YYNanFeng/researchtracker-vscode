export type IdeaRelationType =
  | 'evolves_from'
  | 'inspired_by'
  | 'builds_on'
  | 'contradicts'
  | 'alternative_to'
  | 'refines';

export type IdeaStatus = 'exploring' | 'validated' | 'refuted' | 'parked' | 'abandoned';
export type ExperimentStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ResultStatus = 'success' | 'failed';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type Verdict = 'supported' | 'partial' | 'refuted';

export interface ProjectInfo {
  name: string;
  researchQuestion: string;
  status: ProjectStatus;
  created: string;
}

export interface Idea {
  id: string;
  type: 'idea';
  status: IdeaStatus;
  claim: string;
  evidence?: string;
  created: string;
  updated?: string;
  confidence?: number;
  parents?: Array<{ id: string; relation: IdeaRelationType }>;
  evidence_links?: Array<{ result: string; verdict: Verdict }>;
  tags?: string[];
}

export interface Experiment {
  id: string;
  type: 'experiment';
  status: ExperimentStatus;
  idea: string;
  created: string;
  updated?: string;
  purpose?: string;
  based_on?: string;
  commits?: string[];
  tags?: string[];
}

export interface Result {
  id: string;
  type: 'result';
  experiment: string;
  status: ResultStatus;
  claim: string;
  evidence: string;
  metrics?: Record<string, number>;
  created: string;
}

export interface Reference {
  key: string;
  title: string;
  authors: string;
  year: number;
  venue?: string;
  url?: string;
  tags?: string[];
}

export interface LogEntry {
  type: 'log';
  date: string;
}

export interface ResearchData {
  project: ProjectInfo | null;
  ideas: Map<string, Idea>;
  experiments: Map<string, Experiment>;
  results: Map<string, Result>;
  references: Map<string, Reference>;
  logs: LogEntry[];
}

export type TreeNodeType = 'project' | 'idea' | 'experiment' | 'result' | 'reference' | 'log';

export interface TreeNodeData {
  type: TreeNodeType;
  filePath?: string;
  idea?: Idea;
  experiment?: Experiment;
  result?: Result;
  reference?: Reference;
  log?: LogEntry;
  project?: ProjectInfo;
}
