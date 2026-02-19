# Vercel 部署指南（Mac + GitHub Desktop + VSCode）

这份文档按你当前工具链写：
- 系统：macOS
- 代码工具：VSCode
- Git 工具：GitHub Desktop
- 部署平台：Vercel

---

## 一、首次部署（最推荐：GitHub 自动部署）

### Step 1. 在 GitHub Desktop 提交并推送

1. 打开 **GitHub Desktop**
2. 左上角确认当前仓库是本项目
3. 切到 **Changes** 标签
4. 勾选要提交的文件
5. 在 Summary 输入：`first deploy`
6. 点击 **Commit to main**
7. 点击右上角 **Push origin**

这一步结束后，代码已经在 GitHub 线上仓库。

### Step 2. 在 Vercel 导入仓库

1. 打开 https://vercel.com
2. 用 GitHub 账号登录
3. 点击 `Add New` -> `Project`
4. 在仓库列表中找到你的 fork 仓库，点 `Import`
5. 保持默认配置（这是静态站点，不需要额外构建命令）
6. 点击 `Deploy`

等待部署完成后，会得到一个域名：

- `https://你的项目名.vercel.app`

---

## 二、后续更新（你最常用）

每次改完代码，只做下面这套：

1. VSCode 修改文件并保存
2. GitHub Desktop 查看 Changes
3. 写提交信息，例如：`update fc3d data`
4. `Commit to main`
5. `Push origin`

Vercel 会自动检测到 GitHub 新提交并重新部署。

---

## 三、如何确认部署成功

每次推送后检查：

1. 打开 Vercel 项目页面
2. 进入 `Deployments`
3. 最新记录状态为 `Ready`
4. 点击域名打开页面，检查：
   - 双色球/福彩3D切换可用
   - 三个 Tab 切换正常
   - 图表与历史数据正常显示

---

## 四、常见问题

### 1) 页面是旧版本

原因：浏览器缓存。

处理：
- 强制刷新：`Command + Shift + R`
- 或换无痕窗口打开

### 2) 页面显示数据加载失败

通常是 JSON 文件路径或格式错误。

排查：
1. 检查 `data/*.json` 文件是否存在
2. 用 VSCode 打开 JSON 看是否有语法错误
3. 再次提交并 Push

### 3) Vercel 没有自动部署

排查：
1. 确认 GitHub Desktop 已 `Push origin`
2. 去 GitHub 页面确认提交确实在线上
3. 去 Vercel -> Deployments 看是否有新任务

---

## 五、可选：Vercel CLI（不常用）

如果你后续想用命令行部署：

```bash
npm install -g vercel
vercel login
vercel
```

首次会提示你绑定项目；后续可用：

```bash
vercel --prod
```

但你当前用 GitHub Desktop 工作流更简单，优先用自动部署即可。
