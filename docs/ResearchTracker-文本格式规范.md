# ResearchTracker — `.research/` 文本格式规范

> 设计原则：所有科研数据以 **Markdown + YAML Frontmatter** 存储，人可读、AI 可写、Git 可追踪。
>
> **v2.0 核心变更**：Frontmatter 只管图谱属性（节点、边、可查询字段），Body 只管展开内容（与 Frontmatter 零重复）。

---

## 1. 设计哲学

### 1.1 为什么选择 Markdown + YAML Frontmatter？

| 方案 | 人可读 | AI可写 | Git 友好 | 搜索 | 关系查询 |
|------|:------:|:------:|:--------:|:----:|:--------:|
| SQLite | ❌ | ✅ | ❌（二进制） | ✅ | ✅ |
| JSON | ❌ | ✅ | ✅ | ❌ | ❌ |
| 纯属性（YAML/TOML） | ❌ | ✅ | ⚠️（正文缩进噪音） | ✅ | ✅ |
| **Markdown + Frontmatter** | **✅** | **✅** | **✅** | **✅** | **✅（通过索引）** |

核心思路：

- **YAML Frontmatter** → 图谱的节点属性和边（结构化，可查询，可遍历）
- **Markdown Body** → 人类的阅读材料（按模板组织，是 Frontmatter 的展开而非重复）
- **文件路径即索引** → 通过目录结构建立层级关系，无需数据库也能浏览

### 1.2 Frontmatter 与 Body 的分工原则

```
Frontmatter = 图谱运转需要的数据（节点ID、类型、状态、边、可查询属性）
Body        = 人类阅读的展开内容（Frontmatter 摘要的详细版本）
```

**零重复规则**：同一份信息只存一处。Frontmatter 存一句话摘要，Body 存展开论述。

### 1.3 Body 模板约束 AI 写入

为每种文件类型定义**推荐 section** 和**情景 section**：

- **推荐 section**：AI 写入时应生成，除非确实没有内容
- **情景 section**：有内容就写，没有就跳过
- Body 模板只约束 AI，人类手动编辑时不强制

### 1.4 YAML 安全约定

YAML 的隐式类型转换是已知陷阱，尤其在 AI 写入场景中风险更高：

```yaml
# ❌ 危险写法
status: no          # 被解析为布尔值 false
version: 1.10       # 被解析为浮点数 1.1
country: NO         # 挪威 → false
on: yes             # → true
```

**规则**：

1. **所有字符串值必须加引号**（单引号或双引号均可）
2. **日期时间必须加引号**，使用 ISO 8601 格式（如 `"2026-05-23"`、`"2026-05-23T15:00:00+08:00"`）
3. **枚举值必须加引号**（如 `status: "active"`、`type: "idea"`）
4. **数值类型不加引号**（如 `confidence: 0.85`、`year: 2017`、`fps: 42`）
5. **布尔类型不用 YAML 原生布尔**，改用字符串枚举（如 `status: "success"` 而非 `status: true`）
6. **避免使用 YAML 高级特性**（锚点 `&`、引用 `*`、复杂类型标签 `!!`）
7. **AI 写入时使用 YAML 1.2 failsafe schema** 或 SafeLoader，禁用隐式类型解析

### 1.5 JSON Schema 校验

为每种文件类型定义 JSON Schema，用于：

- **AI 写入前校验**：MCP tool 在写入前用 Schema 校验 Frontmatter，拒绝不合法的结构
- **CLI 校验**：`research validate` 命令检查所有文件是否符合 Schema
- **IDE 提示**：VS Code 插件根据 Schema 提供 Frontmatter 自动补全

Schema 存放在 `@researcher/core` 包中，按文件类型组织：

```
@researcher/core/
└── schemas/
    ├── project.json      # 项目 README 的 Frontmatter Schema
    ├── idea.json         # 思路的 Frontmatter Schema
    ├── experiment.json   # 实验的 Frontmatter Schema
    ├── result.json       # 结果的 Frontmatter Schema
    ├── log.json          # 日志的 Frontmatter Schema
    └── reference.json    # 文献笔记的 Frontmatter Schema
```

示例 Schema（思路）：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "status", "claim", "created"],
  "properties": {
    "id": { "type": "string", "pattern": "^idea-" },
    "type": { "type": "string", "const": "idea" },
    "status": { "type": "string", "enum": ["exploring", "validated", "refuted", "parked", "abandoned"] },
    "claim": { "type": "string" },
    "evidence": { "type": "string" },
    "created": { "type": "string", "format": "date" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "parents": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "relation"],
        "properties": {
          "id": { "type": "string" },
          "relation": { "type": "string", "enum": ["evolves_from", "inspired_by", "builds_on", "contradicts", "alternative_to", "refines"] }
        }
      }
    },
    "evidence_links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["result", "verdict"],
        "properties": {
          "result": { "type": "string", "pattern": "^result-" },
          "verdict": { "type": "string", "enum": ["supported", "partial", "refuted"] }
        },
        "additionalProperties": false
      }
    },
    "tags": { "type": "array", "items": { "type": "string" } },
    "updated": { "type": "string", "format": "date" }
  },
  "additionalProperties": false
}
```

### 1.6 总体目录结构

```
.research/
├── README.md                            # 📖 项目=命题信息
├── config.yaml                          # 静态配置（仅版本号）
├── state.yaml                           # 运行时状态（不入 Git）
├── ideas/                               # 💡 思路
│   └── {idea-slug}/
│       ├── README.md                    # 思路详情
│       └── experiments/
│           └── {exp-id}/
│               ├── README.md            # 实验详情
│               └── result.md            # 实验结果（可选）
├── refs/                                # 📚 文献笔记（全局）
│   └── {key}.md
└── logs/                                # 📝 日志（全局）
    └── {YYYY-MM-DD}.md
```

---

## 2. Frontmatter 字段定义

### 2.1 项目信息 — `README.md`

```yaml
---
name: "小目标检测优化"
researchQuestion: "如何在保持推理速度 ≥30fps 的同时，将小目标 mAP 提升 5% 以上？"
status: active                              # active | completed | archived
created: "2026-05-15"
---
```

| 字段 | 类型 | 必选 | 图谱用途 |
|------|------|:----:|---------|
| `name` | string | ✅ | 节点显示名 |
| `researchQuestion` | string | ✅ | 项目核心问题，AI 问答入口 |
| `status` | enum | ✅ | 过滤：活跃/已完成/归档 |
| `created` | ISO 8601 | ✅ | 时间线排序 |

> 说明：项目 README 没有独立 `id`——项目本身就是根节点，路径 `.research/README.md` 即标识。

---

### 2.2 思路 — `ideas/{slug}/README.md`

```yaml
---
id: idea-fpn-cbam
type: idea                                  # 固定值
status: validated                           # exploring | validated | refuted | parked | abandoned
claim: "在 FPN 融合阶段加入 CBAM，可以增强对小目标特征的响应"
evidence: "FPN top-down 路径对小目标特征保留不足，CBAM 理论上可弥补"  # 可选
created: "2026-05-16"
confidence: 0.85                            # 可选
parents:                                    # 可选（边：思路间关系）
  - {id: idea-fpn-improve, relation: evolves_from}
evidence_links:                             # 可选（边：证据链，关联实验结果）
  - {result: result-exp-002, verdict: supported}
  - {result: result-exp-003, verdict: partial}
  - {result: result-exp-004, verdict: refuted}
tags: [注意力机制, CBAM]                     # 可选
updated: "2026-05-17"                       # 可选
---
```

| 字段 | 类型 | 必选 | 图谱用途 |
|------|------|:----:|---------|
| `id` | string | ✅ | 节点唯一标识，边引用基础 |
| `type` | string | ✅ | 节点类型区分 |
| `status` | enum | ✅ | 过滤：exploring / validated / refuted / parked / abandoned |
| `claim` | string | ✅ | 图谱问答核心："这个思路主张什么" |
| `evidence` | string | | 非实验来源的支撑说明（理论推导、文献支撑等） |
| `created` | ISO 8601 | ✅ | 时间线排序 |
| `confidence` | number | | 过滤："高信心思路有哪些" |
| `parents` | object[] | | **边**：思路间关系（含 relation 类型） |
| `evidence_links` | object[] | | **边**：证据链，关联实验结果（含 verdict 判定） |
| `tags` | string[] | | 过滤和聚合 |
| `updated` | ISO 8601 | | 状态变化追踪 |

**证据链（evidence_links）**：

`evidence_links` 是思路与实验结果之间的边，记录**客观证据关联**。每条记录包含：

| 子字段 | 类型 | 必选 | 说明 |
|--------|------|:----:|------|
| `result` | string | ✅ | 引用的结果 ID |
| `verdict` | enum | ✅ | `supported`（支持）/ `partial`（部分支持）/ `refuted`（反驳） |

**设计原则**：

- Frontmatter 只记"谁判了什么"（result + verdict），是最小化的边
- 详细的"哪方面对、哪方面错"写在 Body 的"实验验证"section 中，是分析内容
- `status` 是研究者的**主观综合判断**，不是从 evidence_links 自动推导的
- `evidence` 字段用于非实验来源的支撑（理论推导、文献等），与 evidence_links 互补

**关系类型**：

| 关系 | 含义 |
|------|------|
| `evolves_from` | 从某思路演化而来 |
| `inspired_by` | 受某思路启发 |
| `builds_on` | 建立在某思路之上 |
| `contradicts` | 与某思路矛盾 |
| `alternative_to` | 某思路的替代方案 |
| `refines` | 对某思路的细化 |

---

### 2.3 实验 — `ideas/{idea}/experiments/{exp-id}/README.md`

```yaml
---
id: exp-002-fpn-cbam
type: experiment                            # 固定值
status: completed                           # planned | running | completed | failed | cancelled
idea: idea-fpn-cbam                         # 所属思路
created: "2026-05-16"
purpose: "验证 CBAM 对 FPN 特征融合的改进效果"   # 可选
based_on: exp-001-baseline                  # 可选（边：配置继承）
commits:                                    # 可选
  - "a1b2c3d"
  - "e4f5g6h"
tags: [消融实验]                             # 可选
updated: "2026-05-17"                       # 可选
---
```

| 字段 | 类型 | 必选 | 图谱用途 |
|------|------|:----:|---------|
| `id` | string | ✅ | 节点标识 |
| `type` | string | ✅ | 节点类型 |
| `status` | enum | ✅ | 过滤：planned / running / completed / failed / cancelled |
| `idea` | string | ✅ | **边**：所属思路（目录结构也隐含此关系） |
| `created` | ISO 8601 | ✅ | 时间线排序 |
| `purpose` | string | | 图谱问答："为什么做这个实验" |
| `based_on` | string | | **边**：配置继承来源 |
| `commits` | string[] | | 代码关联（通过 git 命令展开） |
| `tags` | string[] | | 分组、过滤（如 `5fold-cv`） |
| `updated` | ISO 8601 | | 状态变化追踪 |

**关于 `commits` 字段**：

- 只记录 commit hash，不单独维护文件路径
- 从 commit hash 可推导出：文件列表（`git show --stat`）、具体改动（`git diff`）
- Markdown body 中的自然语言描述作为补充（给人类阅读）

**关于 `based_on` 字段**：

- 可选字段，只在存在明确的配置继承关系时使用
- 形成实验间的继承链，支持 `--ancestors` 回溯
- 替代旧设计的 `comparableWith`：同思路下的实验天然可对比，跨思路的显式对比通过 `based_on` 链或 `tags` 隐含

---

### 2.4 实验结果 — `ideas/{idea}/experiments/{exp-id}/result.md`

```yaml
---
id: result-exp-002
type: result                                # 固定值
experiment: exp-002-fpn-cbam                # 所属实验
status: success                             # success | failed
claim: "CBAM 显著提升了小目标检测精度"
evidence: "mAP_small 从 28.0% 提升到 35.1%（+7.1%），推理速度从 45fps 降至 42fps"
metrics:                                    # 至少一个指标
  mAP: 0.472
  mAP_small: 0.351
  mAP_medium: 0.512
  mAP_large: 0.583
  fps: 42
created: "2026-05-17"
---
```

| 字段 | 类型 | 必选 | 图谱用途 |
|------|------|:----:|---------|
| `id` | string | ✅ | 节点标识 |
| `type` | string | ✅ | 节点类型 |
| `experiment` | string | ✅ | **边**：所属实验 |
| `status` | enum | ✅ | success / failed |
| `claim` | string | ✅ | 图谱问答："结论是什么" |
| `evidence` | string | ✅ | 图谱问答："凭什么" |
| `metrics` | object | ⚠️ | status=success 时必选，status=failed 时不填。图谱查询："哪个实验效果最好"、指标对比 |
| `created` | ISO 8601 | ✅ | 时间线排序 |

---

### 2.5 日志 — `logs/{YYYY-MM-DD}.md`

```yaml
---
type: log                                   # 固定值
date: "2026-05-17"
---
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `type` | string | ✅ | 固定为 `log` |
| `date` | ISO 8601 | ✅ | 日志日期 |

> 日志不参与图谱遍历，Frontmatter 极简。

---

### 2.6 文献笔记 — `refs/{key}.md`

```yaml
---
key: "lin2017fpn"
title: "Feature Pyramid Networks for Object Detection"
authors: "Tsung-Yi Lin, Piotr Dollár, Ross Girshick, et al."
year: 2017
venue: "CVPR"
url: "https://arxiv.org/abs/1612.03144"
tags: [特征金字塔, 多尺度, 目标检测]
---
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `key` | string | ✅ | 文献唯一标识符，与文件名一致 |
| `title` | string | ✅ | 论文标题 |
| `authors` | string | ✅ | 作者列表 |
| `year` | integer | ✅ | 发表年份 |
| `venue` | string | | 发表会议/期刊 |
| `url` | string | | 论文链接 |
| `tags` | string[] | | 自定义标签 |

> 文献不参与图谱遍历，作为独立参考节点。

---

## 3. Body 模板定义

> **核心原则**：Body 只放 Frontmatter 装不下的展开内容，与 Frontmatter 零重复。

### 3.1 项目 README

| Section | 类型 | 说明 |
|---------|:----:|------|
| 研究动机 | 推荐 | researchQuestion 的展开——背景、为什么重要、前人做了什么 |
| 核心方法 | 情景 | 当前主要技术路线概述 |
| 关键结论 | 情景 | 随研究推进积累的关键发现 |
| 当前状态 | 情景 | 最近在做什么、下一步计划 |

### 3.2 思路

| Section | 类型 | 说明 |
|---------|:----:|------|
| 思路展开 | 推荐 | evidence 的展开——详细推理、观察、为什么觉得可行 |
| 实验验证 | 情景 | 引用已完成实验，简述支持/反驳的证据 |
| 后续方向 | 情景 | 待验证的点、TODO 列表 |

### 3.3 实验

| Section | 类型 | 说明 |
|---------|:----:|------|
| 实验设置 | 推荐 | 具体改了什么、与 based_on 实验的差异 |
| 过程记录 | 情景 | 训练过程中的观察 |
| 关键观察 | 情景 | 值得注意的发现 |
| 运行命令 | 情景 | 复现命令 |

### 3.4 结果

| Section | 类型 | 说明 |
|---------|:----:|------|
| 分析 | 推荐 | 对 claim/evidence 的展开解读 |
| 对比 | 情景 | 与其他实验的对比表格 |

### 3.5 日志

**无固定模板**。时间线条目格式：

```markdown
## HH:MM — 标题

- 内容...
```

### 3.6 文献笔记

| Section | 类型 | 说明 |
|---------|:----:|------|
| 核心思想 | 推荐 | 用自己的话总结论文关键贡献 |
| 与本研究的关联 | 情景 | 对当前研究有什么启发 |

---

## 4. 配置文件

### 4.1 静态配置 — `config.yaml`（入 Git）

```yaml
# .research/config.yaml
# research init 时生成，极少变更
version: "1"
```

只保留格式版本号。项目元信息在 README.md，运行时状态在 state.yaml。

### 4.2 运行时状态 — `state.yaml`（不入 Git）

```yaml
# .research/state.yaml（加入 .gitignore）
# CLI/插件自动维护，不同步到远程

active:
  idea: idea-fpn-cbam
  experiment: exp-002-fpn-cbam

last_session:
  active_at: "2026-05-17T15:00:00"
  summary: "Running exp-003 (multiscale). Pending results."
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `active.idea` | string | 当前活跃思路 ID |
| `active.experiment` | string | 当前运行中实验 ID |
| `last_session.active_at` | ISO 8601 | 上次活跃时间 |
| `last_session.summary` | string | 上次会话摘要 |

> **拆分原因**：解决多设备同步时 config.yaml 的并发冲突（v4-P5）。每台设备维护自己的运行时状态，不冲突。

---

## 5. 完整示例

### 5.1 思路 — `ideas/fpn-cbam/README.md`

```markdown
---
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
```

### 5.2 实验 — `ideas/fpn-cbam/experiments/exp-002-fpn-cbam/README.md`

```markdown
---
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

基于 exp-001 baseline 的代码框架，仅将 `fpn.py` 替换为 `fpn_cbam.py`，其他超参数保持一致。

## 过程记录

- Epoch 1-20: 损失快速下降，mAP 稳步上升
- Epoch 50: mAP 46.1%，开始超越 baseline
- Epoch 80: 收敛，mAP 47.2%

## 关键观察

> 训练到 epoch 50 左右时，发现 CBAM 的空间注意力热力图确实在关注小目标区域。

## 运行命令

​```bash
python scripts/train.py experiment=exp-002-fpn-cbam
​```
```

### 5.3 结果 — `ideas/fpn-cbam/experiments/exp-002-fpn-cbam/result.md`

```markdown
---
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

小目标的 AP 提升最为显著，验证了假设。大目标也有小幅提升，说明 CBAM 的作用不局限于小目标。推理速度下降 3fps 在可接受范围内。

## 对比

| 指标 | Baseline (exp-001) | FPN+CBAM (exp-002) | 变化 |
|------|:------------------:|:-------------------:|:----:|
| mAP | 45.0% | 47.2% | **+2.2%** |
| mAP_small | 28.0% | 35.1% | **+7.1%** |
| FPS | 45 | 42 | -3 |
```

### 5.4 日志 — `logs/2026-05-17.md`

```markdown
---
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

修改了 `train.py`，加入多尺度训练逻辑。

> git commit: "feat: add multi-scale training support"
```

### 5.5 文献笔记 — `refs/lin2017fpn.md`

```markdown
---
key: "lin2017fpn"
title: "Feature Pyramid Networks for Object Detection"
authors: "Tsung-Yi Lin, Piotr Dollár, Ross Girshick, et al."
year: 2017
venue: "CVPR"
url: "https://arxiv.org/abs/1612.03144"
tags: [特征金字塔, 多尺度, 目标检测]
---

## 核心思想

FPN 通过自顶向下的路径和横向连接，构建多尺度特征金字塔...

## 与本研究的关联

FPN 是本研究的基础架构。baseline 使用了标准 FPN，后续改进都基于此。
```

### 5.6 完整目录结构

```
.research/
├── README.md
├── config.yaml                              # 只有 version: "1"
├── state.yaml                               # 运行时状态（.gitignore）
│
├── ideas/
│   ├── fpn-improve/
│   │   ├── README.md                        # 思路 A
│   │   └── experiments/
│   │       └── exp-001-baseline/
│   │           ├── README.md                # 实验 1
│   │           └── result.md                # 结果 1
│   │
│   ├── fpn-cbam/
│   │   ├── README.md                        # 思路 B
│   │   └── experiments/
│   │       └── exp-002-fpn-cbam/
│   │           ├── README.md                # 实验 2
│   │           └── result.md                # 结果 2
│   │
│   ├── multiscale/
│   │   ├── README.md                        # 思路 C
│   │   └── experiments/
│   │       └── exp-003-multiscale/
│   │           └── README.md                # 实验 3（运行中）
│   │
│   └── cbam-multiscale/
│       └── README.md                        # 思路 D（刚创建）
│
├── refs/
│   ├── lin2017fpn.md
│   └── woo2018cbam.md
│
└── logs/
    ├── 2026-05-15.md
    ├── 2026-05-16.md
    └── 2026-05-17.md
```

---

## 6. 读写规则

### 6.1 谁写什么

| 操作者 | 写入文件 | 触发时机 |
|--------|---------|---------|
| **CLI `init`** | `config.yaml` + `README.md` + 目录骨架 | 项目初始化 |
| **CLI `idea add`** | `ideas/{slug}/README.md` | 创建思路 |
| **CLI `experiment create`** | `ideas/{idea}/experiments/{exp}/README.md` | 创建实验 |
| **CLI `log-result`** | `ideas/{idea}/experiments/{exp}/result.md` | 记录结果 |
| **CLI `log`** | `logs/{date}.md` | 添加日志 |
| **CLI `ref add`** | `refs/{key}.md` | 添加文献笔记 |
| **VS Code 插件** | 通过 CLI 命令执行 | 图形界面操作 |
| **AI Agent (MCP)** | 通过 MCP tools 执行 | AI 自动记录 |

### 6.2 Frontmatter 的读写约定

```
写入规则：
1. 新建节点 → 写入完整的 Frontmatter + Body（按模板生成 Body section）
2. 更新节点 → 只修改 Frontmatter 中变化的字段，保留 Body
3. 状态变更 → 更新 status 字段 + updated 时间戳
4. AI 写入 → 必须按 Body 模板生成推荐 section，情景 section 有内容才写
5. 人类编辑 → Body 模板不强制，模板只是推荐

读取规则：
1. 单个节点 → 直接读取 Frontmatter 获取图谱属性，Body 获取展开内容
2. 列表查询 → 扫描目录，解析各文件 Frontmatter
3. 关系查询 → 遍历 Frontmatter 中的 parents / based_on / idea 字段
4. 图谱问答 → claim / evidence / metrics 直接从 Frontmatter 提取
5. 深入了解 → 读取 Body 展开内容
```

### 6.3 冲突处理

由于所有文件都是文本格式，天然支持 Git 合并：

```
场景：两个实验同时创建在同一思路下
解决：它们写入的是不同的文件，Git 会自动合并
      ideas/{idea}/experiments/{exp-a}/README.md
      ideas/{idea}/experiments/{exp-b}/README.md

场景：多设备同时操作
解决：运行时状态在 state.yaml（不入 Git），不会冲突
      静态数据分散在各节点文件中，不同节点写入不同文件，Git 自动合并
```

---

## 7. Markdown Body 的书写约定

### 7.1 允许的 Markdown 元素

| 元素 | 用途 | 示例 |
|------|------|------|
| 标题 `#` | 章节划分（对应模板 section） | `## 实验设置` |
| 列表 `-` | 条目罗列 | `- mAP 47.2%` |
| 任务列表 `- [ ]` | 待办事项 | `- [ ] 消融实验` |
| 表格 | 对比数据 | 见 result.md 示例 |
| 代码块 ` ``` ` | 命令记录 | 运行命令 |
| 引用 `>` | 重要观察 | `> CBAM 确实有效` |
| 链接 `[]()` | 关联引用 | `[exp-001](../exp-001-baseline/)` |
| 图片 `![]()` | 内嵌图片 | `![heatmap](./heatmap.png)` |
| 加粗 `**` | 关键结论 | `**+7.1% mAP_small**` |

### 7.2 禁止的元素

- 禁止使用 HTML 标签（保证跨平台兼容）
- 禁止在 Frontmatter 中使用多行字符串（保持 YAML 可解析性）

---

## 8. 与 v1.0 的变更对照

| 变更 | v1.0 | v2.0 | 原因 |
|------|------|------|------|
| Frontmatter 设计原则 | 混合存储（索引+语义） | 图谱属性 + 边，语义内容仅存摘要 | 明确 Frontmatter = 图谱可查询数据 |
| Body 设计原则 | 无约束 | 按模板组织，与 Frontmatter 零重复 | 约束 AI 写入，消除信息冗余 |
| config.yaml | 含 project + active + last_session | 只留 version | 消除与 README.md 的冗余 |
| 新增 state.yaml | 无 | 运行时状态，不入 Git | 解决多设备并发冲突（v4-P5） |
| 新增 `purpose` 字段 | 无 | 实验 Frontmatter 可选 | "为什么做这个实验"（v3-P1） |
| 新增 `based_on` 字段 | 无 | 实验 Frontmatter 可选（边） | 实验配置继承链（v4-P4） |
| 新增 `updated` 字段 | 无 | 所有节点可选 | 状态变化时间可追溯 |
| 新增 `tags` 到实验 | 无 | 实验 Frontmatter 可选 | 实验分组（v3-P2） |
| 移除 `comparableWith` | 实验可选字段 | 移除 | 由 based_on + tags 替代 |
| 移除 config.yaml 中 project 信息 | config.yaml 含 name/created | 移到 README.md | 消除冗余 |

---

## 9. 已确立的架构决策

| ADR | 决策 | 日期 |
|-----|------|------|
| ADR-001 | 命题与项目 1:1 绑定，取消命题目录层 | 2026-05-22 |
| ADR-002 | 实验只通过 commit hash 关联代码，移除 codeFiles/reuses/.research-link.json | 2026-05-22 |
| ADR-003 | 产品命名：CLI 包名 researchtracker，CLI 命令 research | 2026-05-22 |
| ADR-004 | 静态配置与运行时状态分离：config.yaml 入 Git，state.yaml 不入 Git | 2026-05-23 |
| ADR-005 | Frontmatter 只管图谱属性和边，Body 只管展开内容，零重复 | 2026-05-23 |
| ADR-006 | Body 通过模板约束 AI 写入（推荐/情景 section），人类编辑不强制 | 2026-05-23 |
| ADR-007 | YAML 字符串值统一加引号，使用 failsafe schema 防止隐式类型转换 | 2026-05-23 |
| ADR-008 | 为每种文件类型定义 JSON Schema，AI 写入前校验、CLI validate、IDE 自动补全 | 2026-05-23 |
| ADR-009 | evidence 改为可选，新增 evidence_links 证据链边（supported/partial/refuted），支持假设-验证完整链路 | 2026-05-23 |
| ADR-010 | Git 集成策略：.research/ 入 Git（state.yaml 除外），不自动 commit，只在实验开始时自动锚定 HEAD commit hash | 2026-05-23 |

---

*文档版本：v2.3 | 日期：2026-05-23 | 同步 ADR 编号、metrics 条件必选、补全 ADR-009/010*
