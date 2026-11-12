# 共同源码与发布

本仓库从 `yishan/dsh-typing-practice` 的
`90642bd552ce061e9ce2ffac4383aff43f17724b`（v0.1.1）提取共同源码。
原仓库历史保留。后续练习逻辑、界面、语料与设置在本仓库修改。

| 位置 | 职责 |
| --- | --- |
| `packages/practice/src` | 共同练习与游戏、输入、计时、判分、视区、记录、注音、音效与样式 |
| `apps/web` | 网页入口、品牌、浏览器语言与主题、模式导航 |
| `packages/dsh-plugin` | DSH 模块、侧栏、语言与主题接入、快捷键、面板布局、本地对话 |
| `packages/obsidian-plugin` | Obsidian 视图、命令、主题、视图快捷键作用域、按文件夹选取的笔记语料 |
| `data` / `assets` | 三语原创语料、经过校验的键盘录音与许可 |

`createPractice(React, platform)` 每次调用创建独立的缓存与界面实例。
平台提供存储前缀、语言、注音和音效加载方式，以及可选的本地语料接口。
DSH 使用宿主 React；网页将 React 随站点打包。共享模块不引用 DSH 全局对象。

`createGamePage(React, platform)` 复用游戏规则和界面。平台传入品牌资源、游戏记录与音效存储键、布局方式，以及可选的宿主快捷键服务。DSH 游戏与 DSH 练习复用键盘设置；网页保留独立的设置和记录。

## 验证

```bash
npm ci
npm run build
npm test
```

构建会校验语料和音频校验和，输出 `dist/web`、`dist/dsh-plugin` 与 `dist/obsidian-plugin`。
`dist/build-inputs.json` 记录各端真实构建输入；测试确认各端使用同一份练习模块，且互不引入其他适配层。
原插件的时限、IME 组字、记录迁移、本地语料和音效回归测试针对生成的插件运行。
网页测试覆盖平台差异、原生浏览器快捷键、存储隔离与静态资产。

浏览器另行验证输入、布局、焦点和窄屏状态。模拟 composition 事件的测试不能替代
操作系统输入法候选窗验收。

## 网页发布

`vercel.json` 使用仓库根目录，执行 `npm run build:web`，发布 `dist/web`。
网站为静态应用，无服务器接口、模型密钥或数据库。正式域名在 Vercel 项目中单独配置。
网页构建使用带内容指纹的资产；HTML 不配置长期缓存。

## 插件同步

插件仍使用包名 `dsh-typing-practice`、Cordis entry ID `typing-practice`、
原有 `dsh.typing-practice.*` 存储键与 API 路径，保留已有用户数据。

发布时先修改 `packages/dsh-plugin/package.json` 的版本并提交，再运行：

```bash
npm run export:plugin -- /tmp/typefeel-plugin-release
```

导出目录必须不存在或为空。脚本会要求源码干净，重新构建、运行完整测试，并生成
带源提交号的 `SOURCE.json`。审阅输出后，按文件清单更新原插件分发仓库并发布 npm。
导出脚本不会自动推送、覆盖既有仓库或发布包。

GitHub 安装仍应直接使用自包含产物，不要求安装者构建或具有源码目录。
不要在生成的 `client.js`、`index.js` 或注音、音效 chunk 中手工修补逻辑。
网页与插件可以独立发布，不做双向 Git 自动合并。

GitHub Release 与 npm 使用同一份经过审阅的打包产物。发布后核对 GitHub tag、`SOURCE.json`、npm 版本与 `latest`，并比较下载产物的完整性。

## Obsidian 插件同步

插件 id 为 `typefeel`（发布后不可更改），存储键前缀为 `typefeel.obsidian`，
最低 Obsidian 版本见 `packages/obsidian-plugin/manifest.json` 的 `minAppVersion`。
分发仓库为 `yishan/typefeel-obsidian`，只包含发布产物，不在本仓库直接发布。

发布时先修改 `packages/obsidian-plugin/manifest.json` 的版本，并在同目录的
`versions.json` 中加入「插件版本 → 最低 Obsidian 版本」，提交后运行：

```bash
npm run export:obsidian -- /tmp/typefeel-obsidian-release
```

规则与 DSH 导出相同：目录须不存在或为空，源码须干净，脚本重新构建并运行完整测试。
输出包含 `main.js`、`manifest.json`、`styles.css`、`README.md`、`README.zh-CN.md`、
`versions.json`、`LICENSE`、`THIRD_PARTY_NOTICES.md` 和 `SOURCE.json`。

GitHub Release 须附带 `main.js`、`manifest.json`、`styles.css`，tag、Release 名称与
`manifest.json` 版本一致。测试阶段只发布 `x.y.z-beta.N` 预发布版本供 BRAT 安装，
不把默认分支根目录 `manifest.json` 的版本改为新版本；正式版再提交根目录 `manifest.json`
并到 community.obsidian.md 提交。建仓库、发 Release、提交目录都对外可见，须另行确认。

本地调试可把测试笔记库的 `.obsidian/plugins/typefeel` 软链接到 `dist/obsidian-plugin`，
构建后在 Obsidian 中停用再启用插件。不要使用日常笔记库测试。
