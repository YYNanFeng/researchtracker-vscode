import * as path from 'path';
import * as vscode from 'vscode';
import { ResearchScanner } from './reader/scanner';
import { IdeaTreeProvider } from './sidebar/ideaTree';
import { registerCommands } from './commands/register';
import { CLIClient, CLIError } from './cli';

export async function activate(context: vscode.ExtensionContext) {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const researchDir = workspaceRoot
      ? path.join(workspaceRoot, '.research')
      : '';

    const scanner = new ResearchScanner(researchDir);
    await scanner.scan();

    let cli: CLIClient | null = null;
    if (workspaceRoot) {
      cli = new CLIClient(workspaceRoot);
      const available = await cli.checkAvailable();
      if (!available) {
        cli = null;
        vscode.window.showWarningMessage(
          'ResearchTracker: 未检测到 research CLI。请运行 npm install -g researchtracker 安装。',
          '安装说明',
        ).then(choice => {
          if (choice === '安装说明') {
            vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/researchtracker'));
          }
        });
      }
    }

    if (!workspaceRoot || !scanner.project) {
      vscode.window.showInformationMessage(
        'ResearchTracker: 已加载演示数据。',
      );
    }

    const treeProvider = new IdeaTreeProvider(scanner);

    const treeView = vscode.window.createTreeView('researchtracker-ideas', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    });

    context.subscriptions.push(treeView);

    registerCommands(context, scanner, treeProvider, cli);

    if (workspaceRoot) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, '.research/**'),
      );
      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      const debouncedRefresh = () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
          await scanner.scan();
          treeProvider.refresh();
        }, 300);
      };
      watcher.onDidCreate(debouncedRefresh);
      watcher.onDidChange(debouncedRefresh);
      watcher.onDidDelete(debouncedRefresh);
      context.subscriptions.push(watcher);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`ResearchTracker 激活失败: ${err}`);
  }
}

export function deactivate() {}
