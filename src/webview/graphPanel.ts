import * as vscode from 'vscode';
import { ResearchScanner } from '../reader/scanner';

export class GraphPanel {
  public static currentPanel: GraphPanel | undefined;
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

    if (GraphPanel.currentPanel) {
      GraphPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'researchGraph',
      '知识图谱',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'media')],
      },
    );

    GraphPanel.currentPanel = new GraphPanel(panel, extensionUri, scanner);
  }

  private dispose() {
    GraphPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, scanner: ResearchScanner): string {
    const ideas = Array.from(scanner.ideas.values());

    const ideaNodes = ideas.map(idea => ({
      id: idea.id,
      nodeType: 'idea',
      label: idea.claim.substring(0, 20) + (idea.claim.length > 20 ? '...' : ''),
      fullClaim: idea.claim,
      status: idea.status,
      confidence: idea.confidence,
      filePath: `.research/ideas/${idea.id.replace('idea-', '')}/README.md`,
    }));

    const projectInfo = scanner.project;
    const propClaim = projectInfo?.researchQuestion || '（未设置研究问题）';

    const propNodes = [{
      id: 'prop-root',
      nodeType: 'proposition',
      claim: propClaim,
      ideaId: '',
      filePath: '.research/README.md',
    }];

    const propIdeaLinks = ideas.map(idea => ({
      source: 'prop-root',
      target: idea.id,
      relation: 'claim_of',
    }));

    const experimentNodes: Array<{
      id: string;
      nodeType: string;
      label: string;
      status: string;
      purpose: string;
      ideaId: string;
      filePath: string;
      hasResult: boolean;
      resultStatus: string;
      metrics: Record<string, number> | undefined;
    }> = [];

    const ideaExpLinks: Array<{ source: string; target: string; relation: string }> = [];

    for (const idea of ideas) {
      const exps = scanner.getExperimentsForIdea(idea.id);
      for (const exp of exps) {
        const result = scanner.getResultForExperiment(exp.id);
        experimentNodes.push({
          id: exp.id,
          nodeType: 'experiment',
          label: exp.id,
          status: exp.status,
          purpose: exp.purpose ?? '',
          ideaId: idea.id,
          filePath: `.research/ideas/${idea.id.replace('idea-', '')}/experiments/${exp.id}/README.md`,
          hasResult: !!result,
          resultStatus: result?.status ?? '',
          metrics: result?.metrics,
        });
        ideaExpLinks.push({
          source: exp.id,
          target: idea.id,
          relation: 'belongs_to',
        });
      }
    }

    const ideaLinks: Array<{ source: string; target: string; relation: string }> = [];
    for (const idea of ideas) {
      if (idea.parents) {
        for (const parent of idea.parents) {
          ideaLinks.push({ source: idea.id, target: parent.id, relation: parent.relation });
        }
      }
    }

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'media', 'style.css'),
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>知识图谱</title>
  <link rel="stylesheet" href="${styleUri}">
  <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
  <div id="graph-container">
    <div id="graph-header">
      <div class="header-row">
        <div class="header-brand">
          <span class="brand-icon">🔗</span>
          <div class="brand-text">
            <span class="brand-title">知识图谱</span>
            <span class="brand-sub">${ideas.length} 条思路 · ${experimentNodes.length} 个实验</span>
          </div>
        </div>
        <div class="header-actions">
          <div class="action-group">
            <span class="group-label">命题</span>
            <button id="btn-props-show" class="toolbar-btn active" title="显示命题"><span class="btn-icon">⊞</span></button>
            <button id="btn-props-hide" class="toolbar-btn" title="隐藏命题"><span class="btn-icon">⊟</span></button>
          </div>
          <div class="action-divider"></div>
          <div class="action-group">
            <span class="group-label">实验</span>
            <button id="btn-expand-all" class="toolbar-btn active" title="展开所有实验"><span class="btn-icon">⊞</span></button>
            <button id="btn-collapse-all" class="toolbar-btn" title="收起所有实验"><span class="btn-icon">⊟</span></button>
          </div>
          <div class="action-divider"></div>
          <div class="action-group">
            <span class="group-label">视图</span>
            <button id="btn-zoom-in" class="toolbar-btn" title="放大"><span class="btn-icon">＋</span></button>
            <button id="btn-zoom-out" class="toolbar-btn" title="缩小"><span class="btn-icon">－</span></button>
            <button id="btn-zoom-fit" class="toolbar-btn" title="适应窗口"><span class="btn-icon">⊡</span></button>
          </div>
          <div class="action-divider"></div>
          <button id="btn-reset" class="toolbar-btn danger" title="重置布局"><span class="btn-icon">↻</span></button>
        </div>
      </div>
      <div class="header-legend">
        <span class="legend-section">思路</span>
        <span class="legend-item"><span class="dot exploring"></span>探索中</span>
        <span class="legend-item"><span class="dot validated"></span>已验证</span>
        <span class="legend-item"><span class="dot refuted"></span>已反驳</span>
        <span class="legend-item"><span class="dot parked"></span>暂停</span>
        <span class="legend-sep"></span>
        <span class="legend-section">命题</span>
        <span class="legend-item"><span class="dot proposition"></span>命题</span>
        <span class="legend-sep"></span>
        <span class="legend-section">实验</span>
        <span class="legend-item"><span class="dot exp-planned"></span>计划中</span>
        <span class="legend-item"><span class="dot exp-running"></span>运行中</span>
        <span class="legend-item"><span class="dot exp-completed"></span>已完成</span>
        <span class="legend-item"><span class="dot exp-failed"></span>失败</span>
      </div>
    </div>
    <div id="graph-viewport">
      <svg id="graph"></svg>
    </div>
    <div id="tooltip" class="tooltip"></div>
    <div id="zoom-indicator" class="zoom-indicator"></div>
  </div>
  <script>
    const ideaNodes = ${JSON.stringify(ideaNodes)};
    const propNodes = ${JSON.stringify(propNodes)};
    const experimentNodes = ${JSON.stringify(experimentNodes)};
    const ideaLinks = ${JSON.stringify(ideaLinks)};
    const propIdeaLinks = ${JSON.stringify(propIdeaLinks)};
    const ideaExpLinks = ${JSON.stringify(ideaExpLinks)};
    ${this._getGraphScript()}
  </script>
</body>
</html>`;
  }

  private _getGraphScript(): string {
    return `
const vscodeApi = acquireVsCodeApi();

const viewport = document.getElementById('graph-viewport');
const svg = d3.select('#graph');

let currentTransform = d3.zoomIdentity;
const zoomBehavior = d3.zoom()
  .scaleExtent([0.1, 5])
  .on('zoom', (event) => {
    currentTransform = event.transform;
    g.attr('transform', event.transform);
    updateZoomIndicator();
  });

svg.call(zoomBehavior);

function getViewportSize() {
  return { w: viewport.clientWidth, h: viewport.clientHeight };
}

function updateSvgSize() {
  const { w, h } = getViewportSize();
  svg.attr('width', w).attr('height', h);
}

function updateZoomIndicator() {
  document.getElementById('zoom-indicator').textContent = Math.round(currentTransform.k * 100) + '%';
}

updateSvgSize();
window.addEventListener('resize', () => { updateSvgSize(); });

const ideaColorMap = {
  exploring: '#4FC3F7',
  validated: '#66BB6A',
  refuted: '#EF5350',
  parked: '#BDBDBD',
  abandoned: '#757575',
};

const expColorMap = {
  planned: '#90CAF9',
  running: '#FFB74D',
  completed: '#81C784',
  failed: '#E57373',
  cancelled: '#BDBDBD',
};

const expStatusIcon = {
  planned: '📋',
  running: '🔄',
  completed: '✅',
  failed: '❌',
  cancelled: '🚫',
};

const relationLabels = {
  evolves_from: '演化',
  inspired_by: '启发',
  builds_on: '建立于',
  contradicts: '矛盾',
  alternative_to: '替代',
  refines: '细化',
  belongs_to: '',
  claim_of: '',
};

let allNodes = [];
let allLinks = [];
let experimentsExpanded = true;
let propsExpanded = true;

function buildGraph() {
  allNodes = [];
  allLinks = [];

  ideaNodes.forEach(n => {
    n._type = 'idea';
    allNodes.push(n);
  });

  ideaLinks.forEach(l => {
    l._type = 'idea';
    allLinks.push(l);
  });

  if (propsExpanded) {
    propNodes.forEach(n => {
      n._type = 'proposition';
      allNodes.push(n);
    });
    propIdeaLinks.forEach(l => {
      l._type = 'prop';
      allLinks.push(l);
    });
  }

  if (experimentsExpanded) {
    experimentNodes.forEach(n => {
      n._type = 'experiment';
      allNodes.push(n);
    });
    ideaExpLinks.forEach(l => {
      l._type = 'exp';
      allLinks.push(l);
    });
  }
}

const g = svg.append('g');

const defs = g.append('defs');
defs.append('marker')
  .attr('id', 'arrow-idea')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 38)
  .attr('refY', 0)
  .attr('markerWidth', 8)
  .attr('markerHeight', 8)
  .attr('orient', 'auto')
  .append('path')
  .attr('d', 'M0,-4L8,0L0,4')
  .attr('fill', '#666');

defs.append('marker')
  .attr('id', 'arrow-exp')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 28)
  .attr('refY', 0)
  .attr('markerWidth', 6)
  .attr('markerHeight', 6)
  .attr('orient', 'auto')
  .append('path')
  .attr('d', 'M0,-3L6,0L0,3')
  .attr('fill', '#555');

let simulation;
let linkSel, linkLabelSel, nodeSel;

function wrapText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const words = text.split('');
  const lines = [];
  let line = '';
  for (const ch of words) {
    if ((line + ch).length > maxLen) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function render() {
  g.selectAll('.links, .link-labels, .nodes').remove();

  buildGraph();

  const { w, h } = getViewportSize();

  const linkGroup = g.append('g').attr('class', 'links');
  linkSel = linkGroup.selectAll('line')
    .data(allLinks).join('line')
    .attr('stroke', d => d._type === 'exp' ? '#555' : d._type === 'prop' ? '#B39DDB' : '#666')
    .attr('stroke-width', d => d._type === 'prop' ? 1.5 : d._type === 'exp' ? 1 : 1.5)
    .attr('stroke-opacity', d => d._type === 'prop' ? 0.7 : d._type === 'exp' ? 0.4 : 0.6)
    .attr('stroke-dasharray', d => d._type === 'exp' ? '4,3' : 'none')
    .attr('marker-end', d => d._type === 'exp' ? 'url(#arrow-exp)' : d._type === 'prop' ? '' : 'url(#arrow-idea)');

  const labelGroup = g.append('g').attr('class', 'link-labels');
  linkLabelSel = labelGroup.selectAll('text')
    .data(allLinks.filter(l => l._type === 'idea'))
    .join('text')
    .attr('fill', '#888')
    .attr('font-size', '10px')
    .attr('text-anchor', 'middle')
    .attr('dy', -6)
    .text(d => relationLabels[d.relation] || d.relation);

  const nodeGroup = g.append('g').attr('class', 'nodes');
  nodeSel = nodeGroup.selectAll('g')
    .data(allNodes).join('g')
    .style('cursor', 'pointer');

  const ideaNodesSel = nodeSel.filter(d => d._type === 'idea');
  const propNodesSel = nodeSel.filter(d => d._type === 'proposition');
  const expNodesSel = nodeSel.filter(d => d._type === 'experiment');

  // === 思路节点 ===
  ideaNodesSel.append('circle')
    .attr('r', 28)
    .attr('fill', d => ideaColorMap[d.status] || '#999')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2.5)
    .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))');

  ideaNodesSel.append('text')
    .attr('dy', 1)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '14px')
    .attr('pointer-events', 'none')
    .text('💡');

  ideaNodesSel.append('text')
    .attr('dy', 44)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--vscode-descriptionForeground)')
    .attr('font-size', '9px')
    .attr('pointer-events', 'none')
    .text(d => d.id);

  // === 命题节点 ===
  propNodesSel.each(function(d) {
    const node = d3.select(this);
    const lines = wrapText(d.claim, 14);
    const lineH = 14;
    const padding = 10;
    const boxW = 160;
    const boxH = lines.length * lineH + padding * 2;

    node.append('rect')
      .attr('x', -boxW / 2).attr('y', -boxH / 2)
      .attr('width', boxW).attr('height', boxH)
      .attr('rx', 8)
      .attr('fill', 'var(--vscode-editor-background, #1e1e1e)')
      .attr('stroke', '#B39DDB')
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 2px 6px rgba(121, 134, 203, 0.3))');

    node.append('text')
      .attr('x', 0).attr('y', -boxH / 2 + padding - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#B39DDB')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text('📌 命题');

    const textStartY = -boxH / 2 + padding + 10;
    lines.forEach((line, i) => {
      node.append('text')
        .attr('x', 0)
        .attr('y', textStartY + i * lineH)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--vscode-editor-foreground, #ccc)')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none')
        .text(line);
    });
  });

  // === 实验节点 ===
  expNodesSel.append('rect')
    .attr('x', -18).attr('y', -18)
    .attr('width', 36).attr('height', 36)
    .attr('rx', 6)
    .attr('fill', d => expColorMap[d.status] || '#999')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('filter', 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))');

  expNodesSel.append('text')
    .attr('dy', 1)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '12px')
    .attr('pointer-events', 'none')
    .text(d => expStatusIcon[d.status] || '🧪');

  expNodesSel.append('text')
    .attr('dy', 32)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--vscode-descriptionForeground)')
    .attr('font-size', '8px')
    .attr('pointer-events', 'none')
    .text(d => d.label);

  // === 交互 ===
  const tooltip = document.getElementById('tooltip');

  nodeSel.on('mouseover', (event, d) => {
    tooltip.style.display = 'block';
    if (d._type === 'idea') {
      tooltip.innerHTML = '<strong>💡 ' + d.id + '</strong><br>' + d.fullClaim + '<br>状态: ' + d.status + (d.confidence ? '<br>信心: ' + (d.confidence * 100).toFixed(0) + '%' : '');
    } else if (d._type === 'proposition') {
      tooltip.innerHTML = '<strong>📌 命题</strong><br>' + d.claim + '<br>所属思路: ' + d.ideaId;
    } else {
      let html = '<strong>🧪 ' + d.id + '</strong>';
      if (d.purpose) html += '<br>目的: ' + d.purpose;
      html += '<br>状态: ' + d.status;
      if (d.hasResult) html += '<br>结果: ' + d.resultStatus;
      if (d.metrics) html += '<br>' + Object.entries(d.metrics).map(([k,v]) => k + ': ' + v).join(', ');
      tooltip.innerHTML = html;
    }
    let tx = event.pageX + 15;
    let ty = event.pageY - 10;
    if (tx + 320 > window.innerWidth) tx = event.pageX - 330;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  })
  .on('mousemove', (event) => {
    let tx = event.pageX + 15;
    let ty = event.pageY - 10;
    if (tx + 320 > window.innerWidth) tx = event.pageX - 330;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  })
  .on('mouseout', () => { tooltip.style.display = 'none'; })
  .on('dblclick', (event, d) => {
    event.stopPropagation();
    vscodeApi.postMessage({ command: 'openFile', filePath: d.filePath });
  });

  nodeSel.call(d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on('drag', (event, d) => {
      const [mx, my] = currentTransform.invert([event.x, event.y]);
      d.fx = mx; d.fy = my;
      d.x = d.fx; d.y = d.fy;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    })
  );

  simulation = d3.forceSimulation(allNodes)
    .force('link', d3.forceLink(allLinks).id(d => d.id).distance(d => {
      if (d._type === 'prop') return 120;
      if (d._type === 'exp') return 100;
      return 200;
    }))
    .force('charge', d3.forceManyBody().strength(d => {
      if (d._type === 'proposition') return -300;
      if (d._type === 'experiment') return -200;
      return -600;
    }))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collision', d3.forceCollide().radius(d => {
      if (d._type === 'proposition') return 90;
      if (d._type === 'experiment') return 30;
      return 55;
    }))
    .force('x', d3.forceX(w / 2).strength(0.03))
    .force('y', d3.forceY(h / 2).strength(0.03));

  simulation.on('tick', () => {
    linkSel.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
           .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    linkLabelSel.attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
    nodeSel.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
  });

  simulation.on('end', () => { zoomToFit(); });
}

render();

function zoomToFit() {
  const { w, h } = getViewportSize();
  const padding = 80;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  allNodes.forEach(d => {
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  });
  const dx = (maxX - minX) || 1;
  const dy = (maxY - minY) || 1;
  const scale = Math.min((w - padding * 2) / dx, (h - padding * 2) / dy, 1.5);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tx = w / 2 - cx * scale;
  const ty = h / 2 - cy * scale;
  svg.transition().duration(500).call(
    zoomBehavior.transform,
    d3.zoomIdentity.translate(tx, ty).scale(scale)
  );
}

function toggleProps(show) {
  propsExpanded = show;
  if (simulation) simulation.stop();
  render();
  document.getElementById('btn-props-show').classList.toggle('active', show);
  document.getElementById('btn-props-hide').classList.toggle('active', !show);
}

function toggleExperiments(show) {
  experimentsExpanded = show;
  if (simulation) simulation.stop();
  render();
  document.getElementById('btn-expand-all').classList.toggle('active', show);
  document.getElementById('btn-collapse-all').classList.toggle('active', !show);
}

document.getElementById('btn-props-show').addEventListener('click', () => toggleProps(true));
document.getElementById('btn-props-hide').addEventListener('click', () => toggleProps(false));
document.getElementById('btn-expand-all').addEventListener('click', () => toggleExperiments(true));
document.getElementById('btn-collapse-all').addEventListener('click', () => toggleExperiments(false));

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
});
document.getElementById('btn-zoom-fit').addEventListener('click', () => {
  zoomToFit();
});
document.getElementById('btn-reset').addEventListener('click', () => {
  propsExpanded = true;
  experimentsExpanded = true;
  if (simulation) simulation.stop();
  render();
  document.getElementById('btn-props-show').classList.add('active');
  document.getElementById('btn-props-hide').classList.remove('active');
  document.getElementById('btn-expand-all').classList.add('active');
  document.getElementById('btn-collapse-all').classList.remove('active');
});

updateZoomIndicator();
`;
  }
}
