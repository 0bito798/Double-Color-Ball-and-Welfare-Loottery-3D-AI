# 双色球 + 福彩3D 开奖与 AI 预测展示系统

> 在线示例：https://double-color-ball-and-welfare-loott.vercel.app/

这是一个静态前端项目，保留原演示站 UI 风格，并在同一套框架内支持：
- 双色球（6红+1蓝）
- 福彩3D（百十个三位数）

## 主要功能

- 保留原有三大页面：`最新预测` / `图表分析` / `历史回溯`
- 新增彩种切换：`双色球` 与 `福彩3D`
- 不同彩种使用不同规则、统计口径与图表
- 多模型 AI 预测对比（GPT-5 / Claude 4.5 / Gemini 2.5 / DeepSeek R1）
- 历史命中回溯（双色球：红蓝；福彩3D：定位+组选）
- 纯静态部署，可直接部署到 Vercel

---

## 项目结构

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── components.js
│   └── data-loader.js
├── data/
│   ├── lottery_history.json               # 双色球历史开奖
│   ├── ai_predictions.json                # 双色球当前预测
│   ├── predictions_history.json           # 双色球历史命中
│   ├── fc3d_history.json                  # 福彩3D历史开奖
│   ├── fc3d_ai_predictions.json           # 福彩3D当前预测
│   └── fc3d_predictions_history.json      # 福彩3D历史命中
├── vercel.json
└── DEPLOYMENT.md
```

---

## 环境变量配置 (GitHub Secrets)

本项目支持多模型 AI 预测，需配置以下 Secret (Settings -> Secrets and variables -> Actions)：

| 模型 | API Key | Base URL (可选) | Model ID (可选) | 默认 Model ID |
|------|---------|--------------|--------------|----------------|
| **GPT-5** | `OPENAI_API_KEY` | `OPENAI_BASE_URL` | `OPENAI_MODEL_ID` | `gpt-4o` |
| **Claude 4.5** | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` | `ANTHROPIC_MODEL_ID` | `claude-3-5-sonnet-20241022` |
| **Gemini 2.5** | `GEMINI_API_KEY` | `GEMINI_BASE_URL` | `GEMINI_MODEL_ID` | `gemini-2.5-flash` |
| **DeepSeek R1** | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` | `DEEPSEEK_MODEL_ID` | `deepseek-chat` |

> 以前的 `AI_API_KEY` 和 `AI_BASE_URL` 全局配置已废弃。`Model ID` 变量可以让你切换同平台的不同模型，例如把 `OPENAI_MODEL_ID` 设为 `gpt-4-turbo`。

---

## 本地运行（macOS）

### 1) 打开项目

- 用 **GitHub Desktop** Clone/Fork 仓库到本地
- 用 **VSCode** 打开项目目录

### 2) 启动本地服务（必须）

不能直接双击 `index.html`，要走 HTTP 服务：

```bash
python3 -m http.server 8000
```

浏览器访问：

```text
http://localhost:8000
```

---

## 数据说明

### 双色球数据格式（示例）

```json
{
  "period": "26019",
  "red_balls": ["07", "08", "16", "17", "18", "30"],
  "blue_ball": "01",
  "date": "2026-02-12"
}
```

### 福彩3D数据格式（示例）

```json
{
  "period": "2026049",
  "digits": ["5", "7", "6"],
  "number": "576",
  "sum": 18,
  "span": 2,
  "type": "组六",
  "date": "2026-02-18"
}
```

---

## 用 GitHub Desktop 提交代码（你最常用流程）

1. 打开 **GitHub Desktop**，选择这个仓库
2. 左侧会看到改动文件（Changes）
3. 在 Summary 输入提交说明，例如：
   - `feat: add welfare 3d support`
4. 点击 **Commit to main**
5. 点击右上角 **Push origin**

> 完成后，GitHub 仓库会同步最新代码。

---

## 部署到 Vercel（推荐：GitHub 自动部署）

详细见：[`DEPLOYMENT.md`](./DEPLOYMENT.md)

最简单流程：

1. 先把代码 `Push origin` 到 GitHub
2. 打开 https://vercel.com 并用 GitHub 登录
3. `Add New -> Project`
4. 选择这个 GitHub 仓库并点击 Deploy
5. 等待 1~2 分钟，拿到 `https://xxx.vercel.app`

以后只要你在 GitHub Desktop 里继续提交并 Push，Vercel 会自动重新部署。

---

## 免责声明

AI 预测仅用于数据研究与娱乐，不构成任何购彩建议。彩票有随机性，请理性购彩。
