import * as vscode from 'vscode';
import { ResearchScanner } from '../reader/scanner';
import { IdeaTreeProvider, TreeNode } from '../sidebar/ideaTree';
import { GraphPanel } from '../webview/graphPanel';
import { TimelinePanel } from '../webview/timelinePanel';
import { CLIClient, CLIError } from '../cli';

function showCliError(err: unknown) {
  if (err instanceof CLIError) {
    if (err.exitCode === -1) {
      vscode.window.showErrorMessage(
        'ResearchTracker: research CLI 未安装。请运行 npm install -g researchtracker',
      );
    } else {
      vscode.window.showErrorMessage(`ResearchTracker: ${err.stderr}`);
    }
  } else if (err instanceof Error) {
    vscode.window.showErrorMessage(`ResearchTracker: ${err.message}`);
  }
}

export function registerCommands(
  context: vscode.ExtensionContext,
  scanner: ResearchScanner,
  treeProvider: IdeaTreeProvider,
  cli: CLIClient | null,
): void {

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.openFile', async (node: TreeNode) => {
      const filePath = node.data.filePath;
      if (!filePath) return;

      if (scanner['useMock']) {
        const content = scanner.getFileContent(filePath);
        if (content !== undefined) {
          const doc = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
          vscode.window.showTextDocument(doc);
        }
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspaceRoot) {
        const fullPath = require('path').join(workspaceRoot, filePath);
        if (require('fs').existsSync(fullPath)) {
          const doc = await vscode.workspace.openTextDocument(fullPath);
          vscode.window.showTextDocument(doc);
        } else {
          vscode.window.showWarningMessage(`文件不存在: ${filePath}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.refresh', async () => {
      await scanner.scan();
      treeProvider.refresh();
      vscode.window.showInformationMessage('ResearchTracker: 已刷新');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.init', async () => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用，请先安装 research CLI');
        return;
      }
      const name = await vscode.window.showInputBox({ prompt: '输入项目名称' });
      if (!name) return;
      const question = await vscode.window.showInputBox({ prompt: '输入研究问题' });
      if (!question) return;
      try {
        await cli.init({ name, question });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`ResearchTracker: 项目 "${name}" 已初始化`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.idea.add', async () => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      const title = await vscode.window.showInputBox({
        prompt: '输入思路标题',
        placeHolder: '例如：fpn-improve',
      });
      if (!title) return;
      const claim = await vscode.window.showInputBox({
        prompt: '输入思路主张 (claim)',
        placeHolder: '例如：改进 FPN 结构可以提升小目标检测精度',
      });
      if (!claim) return;
      const evidence = await vscode.window.showInputBox({
        prompt: '输入支撑证据（可选）',
      });
      try {
        await cli.addIdea({ title, claim, evidence: evidence || undefined });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`思路 "${title}" 已创建`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.idea.update', async (node?: TreeNode) => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      if (!node || node.data.type !== 'idea') return;
      const idea = node.data.idea;
      if (!idea) return;

      const statuses = ['exploring', 'validated', 'refuted', 'parked', 'abandoned'];
      const statusLabels: Record<string, string> = {
        exploring: '💡 探索中',
        validated: '✅ 已验证',
        refuted: '❌ 已反驳',
        parked: '⏸️ 暂停',
        abandoned: '🗑️ 已放弃',
      };

      const selected = await vscode.window.showQuickPick(
        statuses.map(s => ({ label: statusLabels[s], value: s })),
        { placeHolder: `当前状态: ${statusLabels[idea.status]} — 选择新状态` },
      );
      if (!selected) return;

      try {
        await cli.updateIdea(idea.id, { status: selected.value });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`思路 ${idea.id} 状态已更新为 ${selected.value}`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.experiment.create', async (node?: TreeNode) => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      let ideaId: string | undefined;

      if (node && node.data.type === 'idea' && node.data.idea) {
        ideaId = node.data.idea.id;
      } else {
        const ideas = Array.from(scanner.ideas.values());
        if (ideas.length === 0) {
          vscode.window.showWarningMessage('请先创建思路');
          return;
        }
        const picked = await vscode.window.showQuickPick(
          ideas.map(i => ({ label: `${i.id}`, description: i.claim.substring(0, 50), value: i.id })),
          { placeHolder: '选择所属思路' },
        );
        if (!picked) return;
        ideaId = picked.value;
      }

      const title = await vscode.window.showInputBox({
        prompt: '输入实验标题',
        placeHolder: '例如：ablation-study',
      });
      if (!title) return;

      const purpose = await vscode.window.showInputBox({
        prompt: '输入实验目的（可选）',
      });

      try {
        await cli.createExperiment({
          title,
          idea: ideaId,
          purpose: purpose || undefined,
        });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`实验 "${title}" 已创建`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.experiment.update', async (node?: TreeNode) => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      if (!node || node.data.type !== 'experiment') return;
      const exp = node.data.experiment;
      if (!exp) return;

      const statuses = ['planned', 'running', 'completed', 'failed', 'cancelled'];
      const statusLabels: Record<string, string> = {
        planned: '📋 计划中',
        running: '🔄 运行中',
        completed: '✅ 已完成',
        failed: '❌ 失败',
        cancelled: '🚫 已取消',
      };

      const selected = await vscode.window.showQuickPick(
        statuses.map(s => ({ label: statusLabels[s], value: s })),
        { placeHolder: `当前状态: ${statusLabels[exp.status]} — 选择新状态` },
      );
      if (!selected) return;

      try {
        await cli.updateExperiment(exp.id, { status: selected.value });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`实验 ${exp.id} 状态已更新为 ${selected.value}`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.experiment.logResult', async (node?: TreeNode) => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      if (!node || node.data.type !== 'experiment') return;
      const exp = node.data.experiment;
      if (!exp) return;

      const claim = await vscode.window.showInputBox({
        prompt: '输入结果结论',
        placeHolder: '例如：mAP 提升了 2%',
      });
      if (!claim) return;

      const evidence = await vscode.window.showInputBox({
        prompt: '输入证据描述',
        placeHolder: '例如：mAP 45.0% → 47.2%',
      });
      if (!evidence) return;

      const statusPick = await vscode.window.showQuickPick(
        [{ label: '✅ 成功', value: 'success' }, { label: '❌ 失败', value: 'failed' }],
        { placeHolder: '选择结果状态' },
      );
      if (!statusPick) return;

      let metrics: string | undefined;
      if (statusPick.value === 'success') {
        const metricsInput = await vscode.window.showInputBox({
          prompt: '输入指标（JSON 格式，必填）',
          placeHolder: '{"mAP": 0.472, "fps": 42}',
        });
        if (!metricsInput) return;
        metrics = metricsInput;
      }

      try {
        await cli.logResult(exp.id, {
          claim,
          evidence,
          status: statusPick.value,
          metrics,
        });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`实验 ${exp.id} 结果已记录`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.reference.add', async () => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      const key = await vscode.window.showInputBox({ prompt: '输入文献 key', placeHolder: 'lin2017fpn' });
      if (!key) return;
      const title = await vscode.window.showInputBox({ prompt: '输入论文标题' });
      if (!title) return;
      const authors = await vscode.window.showInputBox({ prompt: '输入作者' });
      if (!authors) return;
      const yearStr = await vscode.window.showInputBox({ prompt: '输入年份', placeHolder: '2017' });
      if (!yearStr) return;
      const venue = await vscode.window.showInputBox({ prompt: '输入发表场所（可选）' });
      const url = await vscode.window.showInputBox({ prompt: '输入论文链接（可选）' });
      const tags = await vscode.window.showInputBox({ prompt: '输入标签，逗号分隔（可选）' });

      try {
        await cli.addReference({
          key,
          title,
          authors,
          year: parseInt(yearStr, 10),
          venue: venue || undefined,
          url: url || undefined,
          tags: tags || undefined,
        });
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage(`文献 ${key} 已添加`);
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.log', async () => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      const content = await vscode.window.showInputBox({
        prompt: '输入日志内容',
        placeHolder: '今天做了什么...',
      });
      if (!content) return;

      try {
        await cli.addLog(content);
        await scanner.scan();
        treeProvider.refresh();
        vscode.window.showInformationMessage('日志已添加');
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.search', async () => {
      if (!cli) {
        vscode.window.showWarningMessage('ResearchTracker: CLI 不可用');
        return;
      }
      const keyword = await vscode.window.showInputBox({
        prompt: '输入搜索关键词',
        placeHolder: 'CBAM, mAP, 注意力...',
      });
      if (!keyword) return;

      try {
        const raw = await cli.search(keyword);
        const lines = raw.split('\n').filter(l => l.trim());
        if (lines.length === 0) {
          vscode.window.showInformationMessage(`未找到与 "${keyword}" 相关的结果`);
          return;
        }
        const items = lines.map(line => ({
          label: line,
        }));
        await vscode.window.showQuickPick(items, {
          placeHolder: `搜索结果 (${items.length} 条)`,
        });
      } catch (err) {
        showCliError(err);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.openGraph', () => {
      GraphPanel.createOrShow(context.extensionUri, scanner);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('researchtracker.openTimeline', () => {
      TimelinePanel.createOrShow(context.extensionUri, scanner);
    })
  );
}
