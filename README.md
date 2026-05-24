# ResearchTracker for VS Code

> ResearchTracker 的 VS Code 插件，在编辑器中管理你的科研过程

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

配合 [ResearchTracker CLI](https://github.com/YYNanFeng/reasearchtracker) 使用，提供可视化的研究管理界面。

## ✨ 功能

- 🌲 **侧边栏树形视图** — 浏览思路、实验、文献
- ➕ **快捷操作** — 一键添加思路、创建实验、记录结果
- 📊 **知识图谱** — 可视化思路间的关系网络
- 📅 **时间线** — 按时间轴查看研究进展
- 🔍 **搜索** — 快速搜索研究内容

## 📦 安装

### 从源码构建

```bash
git clone https://github.com/YYNanFeng/researchtracker-vscode.git
cd researchtracker-vscode
npm install
npm run build
npm run package
```

生成的 `.vsix` 文件可通过以下方式安装：
- VS Code 中按 `Cmd+Shift+P` → `Extensions: Install from VSIX...`
- 或命令行：`code --install extension researchtracker-0.1.0.vsix`

## 🚀 使用

1. 确保项目已通过 [ResearchTracker CLI](https://github.com/YYNanFeng/reasearchtracker) 初始化：

```bash
npm install -g @nanfen/researchtracker
cd your-research-project
research init --name "我的研究"
```

2. 在 VS Code 中打开项目，插件会自动检测 `.research/` 目录并显示侧边栏

3. 通过侧边栏操作：
   - 点击 ✨ 添加思路
   - 右键思路 → 创建实验
   - 右键实验 → 记录结果、更新状态
   - 点击 📊 查看知识图谱
   - 点击 📅 查看时间线

## 📐 功能截图

### 侧边栏树形视图

插件在活动栏中显示 ResearchTracker 图标，展开后以树形结构展示：
- 💡 思路（按状态分组）
- 🧪 实验（按状态分组）
- 📚 文献

### 命令面板

所有操作也可通过命令面板（`Cmd+Shift+P`）执行：

| 命令 | 说明 |
|------|------|
| `ResearchTracker: 初始化项目` | 在当前项目创建 `.research/` 目录 |
| `添加思路` | 添加新的研究思路 |
| `更新思路状态` | 修改思路状态（exploring/validated/refuted） |
| `创建实验` | 基于思路创建新实验 |
| `更新实验状态` | 修改实验状态（planned/running/completed/failed） |
| `记录实验结果` | 为实验添加结果和 metrics |
| `ResearchTracker: 添加文献` | 添加参考文献 |
| `ResearchTracker: 添加日志` | 添加研究日志 |

## 🛠️ 技术栈

- **TypeScript** — 类型安全
- **VS Code Extension API** — 插件开发
- **gray-matter** — Markdown 解析

## 🔗 相关项目

- [ResearchTracker CLI](https://github.com/YYNanFeng/reasearchtracker) — 核心 CLI + MCP Server

## 🤝 贡献

欢迎贡献！请随时提交 Issue 或 Pull Request。

## 📜 许可证

[MIT](LICENSE)
