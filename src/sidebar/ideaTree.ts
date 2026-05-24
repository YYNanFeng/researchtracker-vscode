import * as vscode from 'vscode';
import { ResearchScanner } from '../reader/scanner';
import { Idea, Experiment, Result, Reference, LogEntry, TreeNodeData } from '../reader/types';
import { mockIdeaFilePath, mockExperimentFilePath, mockResultFilePath } from '../utils/uri';

const IDEA_STATUS_ICON: Record<string, string> = {
  exploring: '💡',
  validated: '✅',
  refuted: '❌',
  parked: '⏸️',
  abandoned: '🗑️',
};

const IDEA_STATUS_TEXT: Record<string, string> = {
  exploring: '探索中',
  validated: '已验证',
  refuted: '已反驳',
  parked: '暂停',
  abandoned: '已放弃',
};

const EXP_STATUS_ICON: Record<string, string> = {
  planned: '📋',
  running: '🔄',
  completed: '✅',
  failed: '❌',
  cancelled: '🚫',
};

const EXP_STATUS_TEXT: Record<string, string> = {
  planned: '计划中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export class IdeaTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private scanner: ResearchScanner) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!this.scanner.project && this.scanner.ideas.size === 0) {
      return [];
    }

    if (!element) {
      return this.getRootChildren();
    }

    return element.children ?? [];
  }

  private getRootChildren(): TreeNode[] {
    const children: TreeNode[] = [];

    if (this.scanner.project) {
      children.push(new TreeNode(
        `📖 ${this.scanner.project.name}`,
        vscode.TreeItemCollapsibleState.None,
        {
          type: 'project',
          project: this.scanner.project,
          filePath: '.research/README.md',
        }
      ));
    }

    const sortedIdeas = Array.from(this.scanner.ideas.values())
      .sort((a, b) => {
        const order = ['exploring', 'validated', 'running', 'parked', 'refuted', 'abandoned'];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });

    for (const idea of sortedIdeas) {
      const icon = IDEA_STATUS_ICON[idea.status] ?? '💡';
      const statusText = IDEA_STATUS_TEXT[idea.status] ?? idea.status;
      const label = `${icon} ${idea.claim.substring(0, 30)}${idea.claim.length > 30 ? '...' : ''} [${statusText}]`;

      const ideaNode = new TreeNode(
        label,
        vscode.TreeItemCollapsibleState.Collapsed,
        {
          type: 'idea',
          idea,
          filePath: mockIdeaFilePath(idea.id),
        }
      );
      ideaNode.contextValue = 'idea';
      ideaNode.tooltip = `思路: ${idea.claim}\n状态: ${statusText}\n信心: ${idea.confidence ?? 'N/A'}\n创建: ${idea.created}`;
      ideaNode.description = statusText;
      ideaNode.children = this.getIdeaChildren(idea);
      children.push(ideaNode);
    }

    if (this.scanner.logs.length > 0) {
      const logNode = new TreeNode(
        '📝 日志',
        vscode.TreeItemCollapsibleState.Collapsed,
        { type: 'log' }
      );
      logNode.children = this.scanner.logs.map(log =>
        new TreeNode(`📝 ${log.date}`, vscode.TreeItemCollapsibleState.None, {
          type: 'log',
          log,
          filePath: `.research/logs/${log.date}.md`,
        })
      );
      children.push(logNode);
    }

    if (this.scanner.references.size > 0) {
      const refNode = new TreeNode(
        '📚 文献',
        vscode.TreeItemCollapsibleState.Collapsed,
        { type: 'reference' }
      );
      refNode.children = Array.from(this.scanner.references.values())
        .sort((a, b) => b.year - a.year)
        .map(ref =>
          new TreeNode(`📄 ${ref.key} — ${ref.title.substring(0, 40)}...`, vscode.TreeItemCollapsibleState.None, {
            type: 'reference',
            reference: ref,
            filePath: `.research/refs/${ref.key}.md`,
          })
        );
      children.push(refNode);
    }

    return children;
  }

  private getIdeaChildren(idea: Idea): TreeNode[] {
    const experiments = this.scanner.getExperimentsForIdea(idea.id);
    return experiments.map(exp => {
      const icon = EXP_STATUS_ICON[exp.status] ?? '🧪';
      const statusText = EXP_STATUS_TEXT[exp.status] ?? exp.status;
      const result = this.scanner.getResultForExperiment(exp.id);

      const label = result
        ? `${icon} ${exp.id} [${statusText}]`
        : `${icon} ${exp.id} [${statusText}]`;

      const expNode = new TreeNode(
        label,
        result ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        {
          type: 'experiment',
          experiment: exp,
          result,
          filePath: mockExperimentFilePath(idea.id, exp.id),
        }
      );
      expNode.contextValue = 'experiment';
      expNode.description = statusText;
      expNode.tooltip = `实验: ${exp.id}\n状态: ${statusText}\n目的: ${exp.purpose ?? 'N/A'}\n创建: ${exp.created}`;

      if (result) {
        const metricsStr = result.metrics
          ? Object.entries(result.metrics).map(([k, v]) => `${k}: ${v}`).join(', ')
          : '';
        expNode.children = [
          new TreeNode(
            `📊 ${result.status === 'success' ? '✅' : '❌'} ${metricsStr}`,
            vscode.TreeItemCollapsibleState.None,
            {
              type: 'result',
              result,
              filePath: mockResultFilePath(idea.id, exp.id),
            }
          ),
        ];
      }

      return expNode;
    });
  }
}

export class TreeNode extends vscode.TreeItem {
  children: TreeNode[] = [];
  data: TreeNodeData;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    data: TreeNodeData,
  ) {
    super(label, collapsibleState);
    this.data = data;

    this.command = {
      command: 'researchtracker.openFile',
      title: '打开文件',
      arguments: [this],
    };
  }
}
