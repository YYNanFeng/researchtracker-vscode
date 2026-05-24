import { ResearchData, ProjectInfo, Idea, Experiment, Result, Reference, LogEntry } from '../reader/types';

function createMockData(): ResearchData {
  const project: ProjectInfo = {
    name: '小目标检测优化',
    researchQuestion: '如何在保持推理速度 ≥30fps 的同时，将小目标 mAP 提升 5% 以上？',
    status: 'active',
    created: '2026-05-15',
  };

  const ideas = new Map<string, Idea>();
  const experiments = new Map<string, Experiment>();
  const results = new Map<string, Result>();
  const references = new Map<string, Reference>();

  ideas.set('idea-fpn-improve', {
    id: 'idea-fpn-improve',
    type: 'idea',
    status: 'exploring',
    claim: '改进 FPN 结构可以提升小目标检测精度',
    evidence: 'FPN top-down 路径对小目标特征保留不足，需要结构改进',
    created: '2026-05-15',
    updated: '2026-05-16',
    confidence: 0.6,
    tags: ['FPN', '多尺度'],
  });

  ideas.set('idea-fpn-cbam', {
    id: 'idea-fpn-cbam',
    type: 'idea',
    status: 'validated',
    claim: '在 FPN 融合阶段加入通道-空间注意力（CBAM），可以增强对小目标特征的响应',
    evidence: 'FPN top-down 路径对小目标特征保留不足，CBAM 通过通道+空间注意力理论上可弥补',
    created: '2026-05-16',
    updated: '2026-05-17',
    confidence: 0.85,
    parents: [{ id: 'idea-fpn-improve', relation: 'evolves_from' }],
    evidence_links: [
      { result: 'result-exp-002', verdict: 'supported' },
      { result: 'result-exp-003', verdict: 'partial' },
      { result: 'result-exp-004', verdict: 'refuted' },
    ],
    tags: ['注意力机制', 'CBAM'],
  });

  ideas.set('idea-multiscale', {
    id: 'idea-multiscale',
    type: 'idea',
    status: 'exploring',
    claim: '多尺度训练策略可以提升模型对不同尺寸目标的适应能力',
    evidence: '固定尺度训练导致模型对训练分布外的尺寸泛化不足',
    created: '2026-05-17',
    confidence: 0.5,
    parents: [{ id: 'idea-fpn-improve', relation: 'builds_on' }],
    tags: ['多尺度', '数据增强'],
  });

  ideas.set('idea-cbam-multiscale', {
    id: 'idea-cbam-multiscale',
    type: 'idea',
    status: 'exploring',
    claim: 'CBAM + 多尺度联合训练可以进一步提升小目标检测性能',
    created: '2026-05-17',
    confidence: 0.4,
    parents: [
      { id: 'idea-fpn-cbam', relation: 'builds_on' },
      { id: 'idea-multiscale', relation: 'inspired_by' },
    ],
    tags: ['注意力机制', '多尺度'],
  });

  ideas.set('idea-data-aug', {
    id: 'idea-data-aug',
    type: 'idea',
    status: 'parked',
    claim: '针对小目标的专门数据增强策略（如 Copy-Paste、Mosaic）可以提升检测性能',
    evidence: '小目标样本稀缺是主要瓶颈，数据增强可以缓解样本不均衡',
    created: '2026-05-16',
    updated: '2026-05-17',
    confidence: 0.3,
    tags: ['数据增强'],
  });

  experiments.set('exp-001-baseline', {
    id: 'exp-001-baseline',
    type: 'experiment',
    status: 'completed',
    idea: 'idea-fpn-improve',
    purpose: '建立 baseline 性能指标',
    created: '2026-05-15',
    updated: '2026-05-16',
    tags: ['baseline'],
  });

  experiments.set('exp-002-fpn-cbam', {
    id: 'exp-002-fpn-cbam',
    type: 'experiment',
    status: 'completed',
    idea: 'idea-fpn-cbam',
    purpose: '验证 CBAM 注意力模块对 FPN 特征融合的改进效果',
    based_on: 'exp-001-baseline',
    created: '2026-05-16',
    updated: '2026-05-17',
    commits: ['a1b2c3d', 'e4f5g6h'],
    tags: ['注意力机制'],
  });

  experiments.set('exp-003-multiscale', {
    id: 'exp-003-multiscale',
    type: 'experiment',
    status: 'running',
    idea: 'idea-multiscale',
    purpose: '验证多尺度训练策略的效果',
    based_on: 'exp-001-baseline',
    created: '2026-05-17',
    tags: ['多尺度'],
  });

  experiments.set('exp-004-speed-test', {
    id: 'exp-004-speed-test',
    type: 'experiment',
    status: 'completed',
    idea: 'idea-fpn-cbam',
    purpose: '测试 FPN+CBAM 的推理速度',
    based_on: 'exp-002-fpn-cbam',
    created: '2026-05-17',
    tags: ['速度测试'],
  });

  experiments.set('exp-005-ablation', {
    id: 'exp-005-ablation',
    type: 'experiment',
    status: 'planned',
    idea: 'idea-fpn-cbam',
    purpose: '消融实验：分别验证通道注意力和空间注意力的贡献',
    based_on: 'exp-002-fpn-cbam',
    created: '2026-05-17',
    tags: ['消融实验'],
  });

  results.set('result-exp-001', {
    id: 'result-exp-001',
    type: 'result',
    experiment: 'exp-001-baseline',
    status: 'success',
    claim: 'Baseline 性能已确立',
    evidence: 'mAP 45.0%, mAP_small 28.0%, FPS 45',
    metrics: { mAP: 0.45, mAP_small: 0.28, mAP_medium: 0.49, mAP_large: 0.57, fps: 45 },
    created: '2026-05-16',
  });

  results.set('result-exp-002', {
    id: 'result-exp-002',
    type: 'result',
    experiment: 'exp-002-fpn-cbam',
    status: 'success',
    claim: 'CBAM 显著提升了小目标检测精度',
    evidence: 'mAP_small 从 28.0% 提升到 35.1%（+7.1%），推理速度从 45fps 降至 42fps',
    metrics: { mAP: 0.472, mAP_small: 0.351, mAP_medium: 0.512, mAP_large: 0.583, fps: 42 },
    created: '2026-05-17',
  });

  results.set('result-exp-003', {
    id: 'result-exp-003',
    type: 'result',
    experiment: 'exp-002-fpn-cbam',
    status: 'success',
    claim: 'FPN+CBAM 在 VOC 上效果更好，COCO 上提升有限',
    evidence: 'VOC mAP +3.1%, COCO mAP +0.8%',
    metrics: { voc_mAP: 0.781, coco_mAP: 0.48 },
    created: '2026-05-17',
  });

  results.set('result-exp-004', {
    id: 'result-exp-004',
    type: 'result',
    experiment: 'exp-004-speed-test',
    status: 'success',
    claim: 'CBAM 导致推理速度下降 3fps',
    evidence: 'FPS 从 45 降至 42，仍在实时阈值以上',
    metrics: { fps: 42, latency_ms: 23.8 },
    created: '2026-05-17',
  });

  references.set('lin2017fpn', {
    key: 'lin2017fpn',
    title: 'Feature Pyramid Networks for Object Detection',
    authors: 'Tsung-Yi Lin, Piotr Dollár, Ross Girshick, et al.',
    year: 2017,
    venue: 'CVPR',
    url: 'https://arxiv.org/abs/1612.03144',
    tags: ['特征金字塔', '多尺度', '目标检测'],
  });

  references.set('woo2018cbam', {
    key: 'woo2018cbam',
    title: 'CBAM: Convolutional Block Attention Module',
    authors: 'Sanghyun Woo, Jongchan Park, Joon-Young Lee, In So Kweon',
    year: 2018,
    venue: 'ECCV',
    url: 'https://arxiv.org/abs/1807.06521',
    tags: ['注意力机制', 'CBAM'],
  });

  const logs: LogEntry[] = [
    { type: 'log', date: '2026-05-17' },
    { type: 'log', date: '2026-05-16' },
    { type: 'log', date: '2026-05-15' },
  ];

  return { project, ideas, experiments, results, references, logs };
}

export const mockData = createMockData();

export const mockFileContents: Record<string, string> = {
  '.research/README.md': `---
name: "小目标检测优化"
researchQuestion: "如何在保持推理速度 ≥30fps 的同时，将小目标 mAP 提升 5% 以上？"
status: active
created: "2026-05-15"
---

## 研究动机

小目标检测是目标检测领域的核心挑战之一。在自动驾驶、安防监控等场景中，远距离小目标的检测精度直接影响系统可靠性。

## 核心方法

基于 FPN 架构，探索注意力机制和多尺度训练策略的改进方案。

## 当前状态

已完成 CBAM 注意力机制的验证，正在进行多尺度训练实验。
`,

  '.research/ideas/fpn-improve/README.md': `---
id: idea-fpn-improve
type: idea
status: exploring
claim: "改进 FPN 结构可以提升小目标检测精度"
evidence: "FPN top-down 路径对小目标特征保留不足，需要结构改进"
confidence: 0.6
created: "2026-05-15"
updated: "2026-05-16"
tags: [FPN, 多尺度]
---

## 思路展开

FPN 的 top-down 路径虽然能融合多尺度特征，但在小目标场景下特征保留不足。需要从结构上改进特征融合方式。

## 后续方向

- [ ] 尝试注意力机制增强特征融合
- [ ] 探索多尺度训练策略
`,

  '.research/ideas/fpn-cbam/README.md': `---
id: idea-fpn-cbam
type: idea
status: validated
claim: "在 FPN 融合阶段加入通道-空间注意力（CBAM），可以增强对小目标特征的响应"
evidence: "FPN top-down 路径对小目标特征保留不足，CBAM 通过通道+空间注意力理论上可弥补"
confidence: 0.85
created: "2026-05-16"
updated: "2026-05-17"
parents:
  - {id: idea-fpn-improve, relation: evolves_from}
evidence_links:
  - {result: result-exp-002, verdict: supported}
  - {result: result-exp-003, verdict: partial}
  - {result: result-exp-004, verdict: refuted}
tags: [注意力机制, CBAM]
---

## 思路展开

在 exp-001 baseline 中，观察到 FPN 的 P2/P3 层虽然分辨率较高，但小目标的分类置信度很低。
CBAM 通过通道注意力增强重要特征、空间注意力定位关键区域，理论上可以弥补这一不足。

## 实验验证

- exp-002（**支持**）：mAP 47.2%（+2.2%），mAP_small 35.1%（+7.1%）→ 小目标精度确实提升
- exp-003（**部分支持**）：VOC 上 +3.1%，COCO 上仅 +0.8% → 泛化能力有限
- exp-004（**反驳**）：FPS 从 45 降到 42 → 推理速度有损失

**综合判断**：核心主张（提升小目标精度）成立，但泛化能力和推理速度需要关注。

## 后续方向

- [ ] 尝试 SE-Net, ECA-Net 做对比
- [ ] 消融实验验证通道注意力和空间注意力的各自贡献
- [ ] 探索轻量化注意力模块以减少推理速度损失
`,

  '.research/ideas/multiscale/README.md': `---
id: idea-multiscale
type: idea
status: exploring
claim: "多尺度训练策略可以提升模型对不同尺寸目标的适应能力"
evidence: "固定尺度训练导致模型对训练分布外的尺寸泛化不足"
confidence: 0.5
created: "2026-05-17"
parents:
  - {id: idea-fpn-improve, relation: builds_on}
tags: [多尺度, 数据增强]
---

## 思路展开

固定尺度训练使得模型对训练分布外的尺寸泛化不足。多尺度训练可以让模型见到更多尺寸的样本。

## 后续方向

- [ ] 设计多尺度训练方案
- [ ] 与 CBAM 结合探索联合效果
`,

  '.research/ideas/cbam-multiscale/README.md': `---
id: idea-cbam-multiscale
type: idea
status: exploring
claim: "CBAM + 多尺度联合训练可以进一步提升小目标检测性能"
confidence: 0.4
created: "2026-05-17"
parents:
  - {id: idea-fpn-cbam, relation: builds_on}
  - {id: idea-multiscale, relation: inspired_by}
tags: [注意力机制, 多尺度]
---

## 思路展开

既然 CBAM 有效，那和多尺度训练结合起来会怎样？理论上注意力机制 + 多尺度输入可以互补。
`,

  '.research/ideas/data-aug/README.md': `---
id: idea-data-aug
type: idea
status: parked
claim: "针对小目标的专门数据增强策略（如 Copy-Paste、Mosaic）可以提升检测性能"
evidence: "小目标样本稀缺是主要瓶颈，数据增强可以缓解样本不均衡"
confidence: 0.3
created: "2026-05-16"
updated: "2026-05-17"
tags: [数据增强]
---

## 思路展开

小目标样本稀缺是检测性能瓶颈之一。Copy-Paste 和 Mosaic 等增强策略可以有效增加小目标样本数量。
`,

  '.research/ideas/fpn-improve/experiments/exp-001-baseline/README.md': `---
id: exp-001-baseline
type: experiment
status: completed
idea: idea-fpn-improve
purpose: "建立 baseline 性能指标"
created: "2026-05-15"
updated: "2026-05-16"
tags: [baseline]
---

## 实验设置

标准 FPN 配置，COCO 2017 train2017 训练，val2017 验证。

## 关键观察

Baseline mAP 45.0%，其中小目标 mAP 仅 28.0%，有较大提升空间。
`,

  '.research/ideas/fpn-improve/experiments/exp-001-baseline/result.md': `---
id: result-exp-001
type: result
experiment: exp-001-baseline
status: success
claim: "Baseline 性能已确立"
evidence: "mAP 45.0%, mAP_small 28.0%, FPS 45"
metrics:
  mAP: 0.45
  mAP_small: 0.28
  mAP_medium: 0.49
  mAP_large: 0.57
  fps: 45
created: "2026-05-16"
---

## 分析

Baseline 性能符合预期，小目标检测是主要瓶颈。
`,

  '.research/ideas/fpn-cbam/experiments/exp-002-fpn-cbam/README.md': `---
id: exp-002-fpn-cbam
type: experiment
status: completed
idea: idea-fpn-cbam
purpose: "验证 CBAM 注意力模块对 FPN 特征融合的改进效果"
based_on: exp-001-baseline
created: "2026-05-16"
updated: "2026-05-17"
commits:
  - "a1b2c3d"
  - "e4f5g6h"
tags: [注意力机制]
---

## 实验设置

基于 exp-001 baseline 的代码框架，仅将 fpn.py 替换为 fpn_cbam.py，其他超参数保持一致。

## 过程记录

- Epoch 1-20: 损失快速下降，mAP 稳步上升
- Epoch 50: mAP 46.1%，开始超越 baseline
- Epoch 80: 收敛，mAP 47.2%

## 关键观察

> 训练到 epoch 50 左右时，发现 CBAM 的空间注意力热力图确实在关注小目标区域。
`,

  '.research/ideas/fpn-cbam/experiments/exp-002-fpn-cbam/result.md': `---
id: result-exp-002
type: result
experiment: exp-002-fpn-cbam
status: success
claim: "CBAM 显著提升了小目标检测精度"
evidence: "mAP_small 从 28.0% 提升到 35.1%（+7.1%），推理速度从 45fps 降至 42fps"
metrics:
  mAP: 0.472
  mAP_small: 0.351
  mAP_medium: 0.512
  mAP_large: 0.583
  fps: 42
created: "2026-05-17"
---

## 分析

小目标的 AP 提升最为显著，验证了假设。大目标也有小幅提升，说明 CBAM 的作用不局限于小目标。

## 对比

| 指标 | Baseline (exp-001) | FPN+CBAM (exp-002) | 变化 |
|------|:------------------:|:-------------------:|:----:|
| mAP | 45.0% | 47.2% | **+2.2%** |
| mAP_small | 28.0% | 35.1% | **+7.1%** |
| FPS | 45 | 42 | -3 |
`,

  '.research/ideas/fpn-cbam/experiments/exp-004-speed-test/README.md': `---
id: exp-004-speed-test
type: experiment
status: completed
idea: idea-fpn-cbam
purpose: "测试 FPN+CBAM 的推理速度"
based_on: exp-002-fpn-cbam
created: "2026-05-17"
tags: [速度测试]
---

## 实验设置

在 exp-002 模型上进行推理速度测试，使用单个 RTX 3090。
`,

  '.research/ideas/fpn-cbam/experiments/exp-004-speed-test/result.md': `---
id: result-exp-004
type: result
experiment: exp-004-speed-test
status: success
claim: "CBAM 导致推理速度下降 3fps"
evidence: "FPS 从 45 降至 42，仍在实时阈值以上"
metrics:
  fps: 42
  latency_ms: 23.8
created: "2026-05-17"
---

## 分析

推理速度下降 3fps，但仍在 30fps 实时阈值以上，可以接受。
`,

  '.research/ideas/multiscale/experiments/exp-003-multiscale/README.md': `---
id: exp-003-multiscale
type: experiment
status: running
idea: idea-multiscale
purpose: "验证多尺度训练策略的效果"
based_on: exp-001-baseline
created: "2026-05-17"
tags: [多尺度]
---

## 实验设置

在 baseline 基础上加入多尺度训练（320~800 pixels），其他超参数不变。

## 过程记录

- Epoch 1-10: 训练中...
`,

  '.research/ideas/fpn-cbam/experiments/exp-005-ablation/README.md': `---
id: exp-005-ablation
type: experiment
status: planned
idea: idea-fpn-cbam
purpose: "消融实验：分别验证通道注意力和空间注意力的贡献"
based_on: exp-002-fpn-cbam
created: "2026-05-17"
tags: [消融实验]
---

## 实验设置（计划）

分别去掉通道注意力和空间注意力，对比完整 CBAM 的效果。
`,

  '.research/refs/lin2017fpn.md': `---
key: "lin2017fpn"
title: "Feature Pyramid Networks for Object Detection"
authors: "Tsung-Yi Lin, Piotr Dollár, Ross Girshick, et al."
year: 2017
venue: "CVPR"
url: "https://arxiv.org/abs/1612.03144"
tags: [特征金字塔, 多尺度, 目标检测]
---

## 核心思想

FPN 通过自顶向下的路径和横向连接，构建多尺度特征金字塔。

## 与本研究的关联

FPN 是本研究的基础架构。baseline 使用了标准 FPN，后续改进都基于此。
`,

  '.research/refs/woo2018cbam.md': `---
key: "woo2018cbam"
title: "CBAM: Convolutional Block Attention Module"
authors: "Sanghyun Woo, Jongchan Park, Joon-Young Lee, In So Kweon"
year: 2018
venue: "ECCV"
url: "https://arxiv.org/abs/1807.06521"
tags: [注意力机制, CBAM]
---

## 核心思想

CBAM 通过通道注意力和空间注意力两个维度增强特征表达。

## 与本研究的关联

本研究在 FPN 中集成 CBAM，验证其对小目标检测的改进效果。
`,

  '.research/logs/2026-05-17.md': `---
type: log
date: "2026-05-17"
---

# 2026-05-17 科研日志

## 09:00 — 实验结果分析

exp-002（FPN+CBAM）训练完成，结果很好：
- mAP 47.2%（baseline 45%），提升 2.2%
- mAP_small 35.1%（baseline 28%），提升 7.1%

CBAM 确实有效！

## 10:30 — 新思路

既然 CBAM 有效，那和多尺度训练结合起来会怎样？

> 创建思路 D：CBAM + 多尺度联合训练

## 11:00 — 决策

- 思路 B（FPN+CBAM）标记为 **validated**
- 开始准备 exp-003（多尺度训练）

## 14:00 — 代码修改

修改了 train.py，加入多尺度训练逻辑。

> git commit: "feat: add multi-scale training support"
`,

  '.research/logs/2026-05-16.md': `---
type: log
date: "2026-05-16"
---

# 2026-05-16 科研日志

## 09:00 — 开始 FPN+CBAM 实验

基于 exp-001 baseline，加入 CBAM 注意力模块。

## 15:00 — 训练中

Epoch 50，mAP 46.1%，趋势良好。
`,

  '.research/logs/2026-05-15.md': `---
type: log
date: "2026-05-15"
---

# 2026-05-15 科研日志

## 10:00 — 项目启动

确定研究方向：小目标检测优化。

## 14:00 — Baseline 训练完成

标准 FPN baseline，mAP 45.0%。
`,
};
