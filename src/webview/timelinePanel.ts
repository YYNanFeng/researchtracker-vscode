import * as vscode from 'vscode';
import { ResearchScanner } from '../reader/scanner';

export class TimelinePanel {
  public static currentPanel: TimelinePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, scanner: ResearchScanner) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    const webview = this._panel.webview;
    webview.html = this._getHtmlForWebview(webview, extensionUri, scanner);

    webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'openFile': {
            const content = scanner.getFileContent(message.filePath);
            if (content !== undefined) {
              vscode.workspace.openTextDocument({ content, language: 'markdown' })
                .then(doc => vscode.window.showTextDocument(doc));
            }
            return;
          }
        }
      },
      null,
      this._disposables,
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, scanner: ResearchScanner) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (TimelinePanel.currentPanel) {
      TimelinePanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'researchTimeline',
      '时间线',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'media')],
      },
    );

    TimelinePanel.currentPanel = new TimelinePanel(panel, extensionUri, scanner);
  }

  private dispose() {
    TimelinePanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, scanner: ResearchScanner): string {
    const events = scanner.getTimelineEvents();

    const eventsByDate = new Map<string, typeof events>();
    for (const event of events) {
      const existing = eventsByDate.get(event.date) ?? [];
      existing.push(event);
      eventsByDate.set(event.date, existing);
    }

    const sortedDates = Array.from(eventsByDate.keys()).sort((a, b) => b.localeCompare(a));

    const timelineData = sortedDates.map(date => ({
      date,
      events: eventsByDate.get(date)!.map(e => ({
        type: e.type,
        label: e.label,
        id: e.id,
        filePath: this._getFilePath(e.type, e.id),
      })),
    }));

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'media', 'style.css'),
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>时间线</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="timeline-container">
    <h3>📅 研究时间线</h3>
    <div id="timeline">
      ${timelineData.map(day => `
        <div class="timeline-date-group">
          <div class="timeline-date">${day.date}</div>
          ${day.events.map(event => `
            <div class="timeline-event" data-filepath="${event.filePath}" onclick="openFile('${event.filePath}')">
              <div class="timeline-icon">${this._getEventIcon(event.type)}</div>
              <div class="timeline-content">
                <div class="timeline-label">${event.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>
  <script>
    const vscodeApi = acquireVsCodeApi();
    function openFile(filePath) {
      vscodeApi.postMessage({ command: 'openFile', filePath: filePath });
    }
  </script>
</body>
</html>`;
  }

  private _getEventIcon(type: string): string {
    switch (type) {
      case 'idea': return '💡';
      case 'experiment': return '🧪';
      case 'result': return '📊';
      case 'log': return '📝';
      default: return '📌';
    }
  }

  private _getFilePath(type: string, id: string): string {
    switch (type) {
      case 'idea':
        return `.research/ideas/${id.replace('idea-', '')}/README.md`;
      case 'log':
        return `.research/logs/${id}.md`;
      default:
        return '';
    }
  }
}
