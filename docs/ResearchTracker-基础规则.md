# ResearchTracker — 基础规则

> 本文档确立 ResearchTracker 的基础约定。所有上层设计（CLI、VS Code 插件、MCP 协议等）必须以此为基准进行设计。

---

## 1. 定位

ResearchTracker 是一套**科研记录约定（convention）**，不是复杂的软件系统。

它的目标是：建立一套人类和 AI 都能读写的规则，让科研过程可追溯。

解决三个核心痛点：

| 痛点 | 说明 |
|------|------|
| 记录麻烦 | 让 AI 自动记录，不要人手动填 |
| 关联麻烦 | 自动知道"这个实验改了什么"，不要人手动标注 |
| 追溯麻烦 | 想找的时候能快速找到过去做了什么 |

---

## 2. 核心原则

1. **约定优于工具**：先定规则，工具只是辅助读写的上层建筑
2. **人类和 AI 双友好**：文件格式必须同时让人类可以直接编辑、让 AI 可以可靠解析
3. **最小维护成本**：只维护 AI 能可靠推断/生成的信息，不要求人手动填写复杂结构
4. **Git 是真相来源**：代码追踪交给 Git，不在 Frontmatter 里重复建模
5. **可选优于必填**：大部分字段可选，核心信息极简，宁可少记不要乱记
6. **零重复**：同一份信息只存一处。Frontmatter 存图谱属性（摘要），Body 存展开内容，不重复
7. **图谱驱动**：文件格式服务于知识图谱的构建——Frontmatter 提供节点、边、属性，Body 提供人类可读的上下文

---

## 3. 项目与命题

**规则：一个项目 = 一个命题。**

- 项目（Git 仓库）本身就代表一个研究方向
- 如需探索不同命题，创建新项目
- 不在一个项目内支持多命题并行

---

## 4. 目录结构

```
.research/
├── README.md              # 项目=命题信息（研究问题、背景、状态）
├── config.yaml            # 静态配置（仅版本号）
├── state.yaml             # 运行时状态（不入 Git）
├── ideas/                 # 思路（每个思路一个目录）
│   └── {idea-slug}/
│       ├── README.md      # 思路定义
│       └── experiments/   # 该思路下的实验
│           └── {exp-id}/
│               ├── README.md   # 实验定义
│               └── result.md   # 实验结果（可选，有结果时创建）
├── refs/                  # 文献笔记（全局，统一放置）
│   └── {key}.md
└── logs/                  # 科研日志（全局，统一放置）
    └── {YYYY-MM-DD}.md
```

**要点**：
- 没有 `propositions/` 层。命题信息放在 `.research/README.md` 中
- `refs/` 和 `logs/` 统一放在 `.research/` 顶层，不嵌套在任何节点下
- 思路和实验仍然是层级关系：实验嵌套在思路下
- `state.yaml` 加入 `.gitignore`，不同步到远程

---

## 5. 文件格式

所有文件统一为 **YAML Frontmatter + Markdown Body**：

- **Frontmatter**：图谱属性和边（结构化，可查询，可遍历）
- **Body**：展开内容（按模板组织，与 Frontmatter 零重复）

> 详细字段定义和 Body 模板见《文本格式规范 v2.0》。

### 5.1 项目信息（`.research/README.md`）

```yaml
---
name: "项目名称"
researchQuestion: "要回答的研究问题"
status: active | completed | archived
created: "2026-05-23"
---
```

### 5.2 思路（`ideas/{slug}/README.md`）

```yaml
---
id: idea-{slug}
type: idea
status: exploring | validated | refuted | parked | abandoned
claim: "这个思路主张什么"
evidence: "非实验来源的支撑说明"              # 可选
created: "2026-05-23"
confidence: 0.7                            # 可选
parents:                                  # 可选（边：思路间关系）
  - {id: idea-xxx, relation: evolves_from}
evidence_links:                            # 可选（边：证据链，关联实验结果）
  - {result: result-exp-xxx, verdict: supported}
  - {result: result-exp-yyy, verdict: partial}
  - {result: result-exp-zzz, verdict: refuted}
tags: [标签1, 标签2]                       # 可选
updated: "2026-05-23"                     # 可选
---
```

### 5.3 实验（`ideas/{slug}/experiments/{exp-id}/README.md`）

```yaml
---
id: exp-{seq}-{slug}
type: experiment
status: planned | running | completed | failed | cancelled
idea: idea-{slug}                         # 所属思路（边）
created: "2026-05-23"
purpose: "为什么做这个实验"                  # 可选
based_on: exp-{seq}-{slug}                # 可选（边：配置继承）
commits: ["a1b2c3d"]                      # 可选
tags: [标签]                               # 可选（支持分组，如 5fold-cv）
updated: "2026-05-23"                     # 可选
---
```

### 5.4 结果（`ideas/{slug}/experiments/{exp-id}/result.md`）

```yaml
---
id: result-{exp-id}
type: result
experiment: exp-{seq}-{slug}
status: success | failed
claim: "结论是什么"
evidence: "凭什么这样说"
metrics:                                  # status=success 时必选，failed 时不填
  mAP: 0.45
created: "2026-05-23"
---
```

### 5.5 文献（`refs/{key}.md`）

```yaml
---
key: lin2017fpn
title: "Feature Pyramid Networks for Object Detection"
authors: "Tsung-Yi Lin et al."
year: 2017
venue: CVPR
url: "https://arxiv.org/abs/1612.03144"
tags: [特征金字塔]                         # 可选
---
```

### 5.6 日志（`logs/{YYYY-MM-DD}.md`）

```yaml
---
type: log
date: "2026-05-23"
---
## 15:00 — 标题

- 内容...
```

### 5.7 配置文件

**config.yaml**（入 Git）——静态配置：
```yaml
version: "1"
```

**state.yaml**（不入 Git）——运行时状态：
```yaml
active:
  idea: idea-xxx
  experiment: exp-xxx
last_session:
  active_at: "2026-05-23T15:00:00"
  summary: "上次在做什么"
```

---

## 6. 命名约定

| 对象 | 格式 | 示例 |
|------|------|------|
| 思路目录 | `{slug}` (kebab-case) | `fpn-cbam` |
| 思路 ID | `idea-{slug}` | `idea-fpn-cbam` |
| 实验目录 | `exp-{序号}-{slug}` | `exp-001-baseline` |
| 实验结果 | `result.md`（固定名） | `result.md` |
| 文献笔记 | `{key}.md` | `lin2017fpn.md` |
| 日志 | `{YYYY-MM-DD}.md` | `2026-05-23.md` |

**注意**：实验命名不再包含命题缩写前缀（因为命题=项目，无需区分）。

---

## 7. 关联约定

### 7.1 层级归属（目录结构隐含）

- 实验嵌套在思路目录下 → 隐含"实验属于思路"
- 不需要额外的 `belongsTo` 关系字段

### 7.2 思路间关系（Frontmatter `parents` 字段）

```yaml
parents:
  - {id: idea-a, relation: evolves_from}
  - {id: idea-b, relation: inspired_by}
```

关系类型：

| 关系 | 含义 |
|------|------|
| `evolves_from` | 从某思路演化而来 |
| `inspired_by` | 受某思路启发 |
| `builds_on` | 建立在某思路之上 |
| `contradicts` | 与某思路矛盾 |
| `alternative_to` | 某思路的替代方案 |
| `refines` | 对某思路的细化 |

### 7.3 代码关联（Frontmatter `commits` 字段）

实验通过 commit hash 列表关联代码。不单独维护文件路径。

```
想知道涉及了哪些文件 → git show --stat <hash>
想知道具体改了什么   → git diff <hash>~1 <hash>
想知道谁改的         → git blame <file>
```

### 7.4 实验配置继承（Frontmatter `based_on` 字段）

实验间通过 `based_on` 建立配置继承关系（边）。支持 `--ancestors` 回溯完整进化链。

同思路下的实验天然可对比，跨思路的显式对比通过 `based_on` 链或 `tags` 隐含。

### 7.5 实验分组（Frontmatter `tags` 字段）

通过 `tags` 实现实验分组（如 `5fold-cv`、`ablation`、`lr-search`），支持过滤和聚合查询。

---

> **架构决策记录**（包括已确立的 ADR 和待讨论问题）见 [ResearchTracker-架构决策记录.md](./ResearchTracker-架构决策记录.md)

---

*文档版本：v2.2 | 日期：2026-05-23 | metrics 条件必选对齐*
