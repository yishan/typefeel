# Obsidian 插件接入

状态：2026-11-11 评审通过。快捷键 Scope、`startWithText` 共享入口、localStorage 存储方案均已确认；成绩不随笔记库同步；笔记语料必须先选文件夹；最低版本 1.8.7；分发仓库定为 `yishan/typefeel-obsidian`。2026-11-12：第一至三阶段完成；第四阶段完成 Scope 和导出脚本，手机端验证未做。发布（建仓库、BRAT、社区目录）另行处理，见"发布渠道"。

## 目标

- 在 Obsidian 中提供与网页版、DSH 版一致的字感练习和落字游戏。
- 用户可以用自己笔记库里的文字练习，替代 DSH 版的"本地对话语料"。
- 练习行为仍以 `packages/practice/src` 为唯一来源。Obsidian 只新增适配层，不复制共享逻辑。
- 不影响网页和 DSH：存储键、模块标识、快捷键保持不变。

## 不做

- 不读取 DSH 对话，不访问网络，不上传笔记内容。
- 第一版不支持弹出窗口（popout window），也不做跨笔记库同步成绩。
- 不默认绑定任何 Obsidian 全局快捷键（官方插件指南要求）。
- 成绩不随笔记库同步（已确认）。

## 结构

新增 `packages/obsidian-plugin`，与 `packages/dsh-plugin` 平级：

```
packages/obsidian-plugin/
  manifest.json            id: typefeel，minAppVersion: 1.8.7
  versions.json            插件版本 → 最低 Obsidian 版本，随发布更新
  README.md / README.zh-CN.md  分发仓库说明
  icon.svg
  src/main.js              Plugin 与 ItemView：视图、视图 Scope、侧边栏图标、命令、编辑器菜单、插件设置页
  src/app.js               首次打开视图时加载：创建共享页面、挂载与卸载 React
  src/platform.js          平台参数、文案、Scope 判断（不引用 obsidian，便于测试）
  src/vault-corpus.js      fetchCorpus：从笔记库选取段落；选中内容的请求
  src/markdown.js          清理 Obsidian 专有语法
  src/folders.js           文件夹设置的规范化、改名与删除
  src/folder-settings.js   字感设置对话框中的"我的笔记"一节
  src/theme.js             --tf-* 对应到 Obsidian 主题变量
  src/scope-css.js         构建时给共享样式加 .typefeel-host 前缀
```

插件 id 用 `typefeel`。Obsidian 规定 id 中不能包含 "obsidian"，发布后也不能再改。

### 最低版本：1.8.7

依据官方 `obsidian.d.ts`（npm `obsidian@1.14.4`）中的 `@since` 标注，计划使用的 API 中版本要求最高的是 `getLanguage()`：

| API | 用途 | 最低版本 |
|---|---|---|
| `getLanguage()` | 判断界面语言 | 1.8.7 |
| `Workspace.revealLeaf()`（返回 Promise） | 打开或聚焦字感标签页 | 1.7.2 |
| `Vault.getAllFolders()` | 文件夹选择列表 | 1.6.6 |
| `View.scope` | 游戏中拦截 Mod+P | 1.5.7 |
| `getFrontMatterInfo()` | 去掉 frontmatter | 1.5.7 |
| `AbstractInputSuggest` | 设置页中的文件夹输入提示 | 1.4.10 |
| `editor-menu` 事件 | 右键"用选中内容练习" | 1.1.0 |
| `registerView`、`ItemView`、`getMarkdownFiles`、`cachedRead`、`loadData`/`saveData` | 基础能力 | 0.9.7 |

`obsidian@1.8.7` 发布于 2025-02-18，当前最新为 1.14.4（2026-10-08）。要想把最低版本降到 1.6.6，就得用 `moment.locale()` 或私有的 localStorage 键来判断界面语言，不值得。项目不做类型检查，也没有安装 `obsidian` 开发依赖（构建时它是 external），所以以后新增 Obsidian API 调用时，评审要对照官方 `obsidian.d.ts` 的 `@since`，超过 1.8.7 就同步提高 `minAppVersion` 并更新 `versions.json`。

手机端额外的限制：iOS 16.4 以下不支持正则后向断言（官方移动端开发说明）。当前共享代码和依赖中都没有后向断言，加入构建检查防止以后引入。共享样式里的 container query 需要 iOS 16 及以上。

### 视图

- `registerView('typefeel', leaf => new TypefeelView(leaf, plugin))`。默认在主编辑区打开新标签页，以保留沉浸式布局。
- `onOpen` 中对 `contentEl` 调用 `createRoot` 并渲染模式切换页，结构照搬 DSH 的 `TypefeelPage`（练习 / 游戏切换，语言跟随宿主）。`onClose` 时 `unmount`。
- 多个字感标签页可以同时存在，各自独立挂载；共享的偏好和成绩写同一份存储。
- 平台标识为 `id: 'obsidian'`，供 `data-platform` 选择器做宿主专属样式。视图容器宽度会变，沿用 DSH 的 container query 写法。

### 平台参数

| 参数 | 值 |
|---|---|
| `storagePrefix` | `typefeel.obsidian` |
| `fullShortcuts` | `false`（与网页一致，练习只用 Escape） |
| `locale` | 根据 Obsidian 界面语言（`getLanguage()`，以 `en` 开头取英文，否则取中文）构造与网页 `createLocale` 同形状的对象 |
| `loadPronunciation` / `loadAudio` | 动态 `import()`，见"构建" |
| `fetchCorpus` | 笔记库语料，见下节 |
| `copy` | 覆盖语料相关文案（"本地对话语料"改为"我的笔记"等） |
| `SettingsFooter` | 指向 typefeel.app 的链接，同 DSH |
| 游戏 `recordsKey` | `typefeel.obsidian.game.records.v1` |
| 游戏 `audioKeys` | `typefeel.obsidian.game.audio.v1` / `typefeel.obsidian.sound.v1` |

Obsidian 内所有笔记库共用一个 `localStorage`，所以偏好和成绩在同一设备的各个笔记库之间共享，这与"成绩只保存在本设备"的现有说法一致。已确认成绩不需要随笔记库同步，因此共享代码不增加 `platform.storage` 抽象。

例外是笔记语料的文件夹设置：文件夹路径只对某一个笔记库有意义，所以它存在插件的 `data.json` 里（`loadData`/`saveData`），每个笔记库各自一份。

### 主题

`theme.js` 把共享样式变量映射到 Obsidian 变量，跟随用户主题和深浅色：

| 共享变量 | Obsidian 变量 |
|---|---|
| `--tf-bg-base` | `--background-primary` |
| `--tf-bg-layer-1/2/3` | `--background-secondary`、`--background-primary-alt`、`--background-modifier-hover` |
| `--tf-border-l1/l2` | `--background-modifier-border`、`--background-modifier-border-hover` |
| `--tf-brand-primary` / `--tf-on-brand` | `--interactive-accent` / `--text-on-accent` |
| `--tf-label-primary/secondary` | `--text-normal` / `--text-muted` |
| `--tf-state-error/success-primary` | `--text-error` / `--text-success` |

具体对应关系在真实主题（默认浅色、默认深色、至少一个流行社区主题）下目测调整。

### 快捷键

- 练习：只用 Escape，与网页一致。
- 游戏：Escape 暂停。Cmd/Ctrl+P 在 Obsidian 中是命令面板。做法是在视图上挂一个 `Scope`，仅当字感视图获得焦点且游戏在进行中时拦截 Mod+P 并暂停，其余时候放行给命令面板。如果实测 `Scope` 拦截不可靠，退回只用 Escape，并在设置里说明。
  - 实现（第四阶段）：视图构造时 `this.scope = new Scope(this.app.scope)`，注册一个不限按键的处理函数（`register(null, null, fn)`）。Obsidian 的 `Scope.handleKey` 对指定了按键的处理函数总是就此返回，即使返回 `undefined` 也不再交给上级作用域，所以不能直接注册 `['Mod'], 'p'`，否则游戏未进行时命令面板也打不开；不限按键的处理函数返回 `undefined` 时会继续交给上级。
  - 拦截条件（`platform.js` 的 `reservesGamePause`）：Cmd 或 Ctrl 之一加 P，无 Shift、Alt；视图中有游戏根节点，`data-status` 为 `running` 或 `countdown`；焦点在游戏内且不在打开的对话框中；不在输入法组字。返回 `false` 时 Obsidian 会阻止默认行为并停止冒泡，但同一 `window` 上的其他监听器仍会执行，所以共享游戏代码照常暂停，共享代码不改。
  - 暂停后再按 Cmd/Ctrl+P 打开命令面板，而不是继续拦截：游戏已经停下，用户此时多半是想用命令面板。
- 输入法组字期间不触发任何快捷键，沿用共享代码现有判断。
- 提供命令（用户可自行绑定快捷键）："打开字感""打开落字游戏""用选中内容练习"。

## 笔记库语料

### 共享代码重构（前置步骤）

`proseRuns` 和 `splitPassages` 现在位于 `packages/dsh-plugin/src/corpus.js`，同一文件依赖 `node:crypto` 和 `setImmediate`。为了让 Obsidian 复用且不复制：

1. 把 `proseRuns`、`splitPassages` 和 `unsuitable` 规则移到 `packages/practice/src/prose.js`，只依赖 `mdast-util-from-markdown` 和 `text-policy.js`，不依赖 Node API。
2. DSH 的 `corpus.js` 改为从这里导入，`extractPassages` 留在 DSH（处理的是对话事件），哈希仍用 `createHash`。
3. 现有 `tests/corpus.test.js` 不改断言，全部通过，作为 DSH 行为不变的证据。

### 选取逻辑

`fetchCorpus(params, signal)` 沿用现有接口：接收 `language`、`mode`、`length`、`exclude`、`recent`，返回 `{ candidate, reason }`，`reason` 取值为 `empty`、`limited`、`insufficient`、`unavailable`、`busy`。

- 候选来源：只读取用户选定文件夹（含子文件夹）中的 Markdown 文件，按修改时间倒序，用 `cachedRead` 读取。没有选定文件夹时不读取任何笔记，直接返回 `reason: 'unconfigured'`。
- 预算：最多读取 200 个文件、累计 20 万字符，每处理一个文件让出一次主线程并检查 `signal`。超出预算时返回 `limited`。
- 去重：对每个段落计算 SHA-256（用 `crypto.subtle`，手机端也可用），跳过 `exclude` 和 `recent` 中已有的指纹，并沿用 `nearDuplicate`。
- 逐段模式（passage）：`source` 包含 `sessionId`（填笔记路径，满足共享代码的校验）和 `fingerprint`。
- 限时模式（timed）：与 DSH `corpus-routes.js` 相同，拼接多段直到达到 1200 字符，`source.fingerprints` 列出各段指纹。拼接规则需要和 DSH 共用，这一部分也一并移入 `prose.js`。
- 隐私：笔记路径只在内存里传给当前会话，不写入成绩；成绩只记录指纹，与 DSH 相同。

### 选择文件夹

笔记可能含私密内容，所以笔记语料必须先由用户选择文件夹才能使用，默认一个都不选。

- 存储：`data.json` 中的 `{ version: 1, folders: string[] }`。路径先经 `normalizePath()` 处理；读取时丢弃已不存在的文件夹。选择根目录 `/` 等于整个笔记库，需要用户主动选。
- 入口一（主要）：在字感设置对话框里，通过 `platform.Settings` 增加"笔记文件夹"一节，列出已选文件夹，可以移除；添加用原生输入框加 `<datalist>`，候选来自 `getAllFolders()`。这个对话框是用 `showModal()` 打开的，Obsidian 的弹窗会被压在它下面无法操作，所以这里不用 `FuzzySuggestModal`。
- 入口二：Obsidian 插件设置页（`PluginSettingTab`）提供同样的列表，"添加文件夹"打开 `FuzzySuggestModal`。两处读写同一份数据，任何一处修改后都通知已打开的视图。
- 没有选文件夹时切到"我的笔记"：`fetchCorpus` 返回 `reason: 'unconfigured'`。共享代码目前把未知原因一律显示为 `corpusUnavailable`，这里给它加一个分支：`unconfigured` 显示 `corpusUnconfigured` 文案（Obsidian 版为"请先在设置中选择用于练习的笔记文件夹，已使用默认语料。"）。网页和 DSH 不会返回这个原因，行为不变。
- 文件夹重命名或删除：监听 `vault.on('rename')` 更新路径，`delete` 时移除。

### Obsidian 语法清理

`markdown.js` 在交给 `proseRuns` 之前先清理（利用 `metadataCache` 提供的 frontmatter 位置）：

| 语法 | 处理 |
|---|---|
| frontmatter | 删除 |
| `[[笔记]]`、`[[笔记\|别名]]` | 保留显示文字 |
| `![[嵌入]]` | 作为段落边界删除 |
| `%%注释%%` | 删除 |
| `==高亮==` | 保留文字 |
| `#标签` | 删除 |
| callout（`> [!note]`） | 去掉标题行，正文按引用块处理 |
| 数学公式、Dataview 等代码块 | 已由 `proseRuns` 当作边界 |

### 用选中内容练习

编辑器右键菜单和命令"用选中内容练习"：先清理 Obsidian 语法，再按内容判断语言（英文、粤语或普通话）。共享的 `selectionPassage` 保留从开头起连续的、可以输入的句子，最长到"长"档上限，再按长度自动归到短、中、长中的一档；太短或含疑似隐私内容时提示无法练习。

共享代码新增 `startWithText(request)`（`createPractice` 的返回值）。请求在练习页挂载前先暂存，挂载后由最新的练习页接收；这一轮标记为"交接文本"，不会被"本地语料"的自动刷新替换，用户点"换一段"后才回到笔记语料。网页和 DSH 不调用它。与 `unconfigured` 提示一起，是共享代码仅有的两处行为扩展。

## 构建

在 `scripts/build.mjs` 增加 `--obsidian` 目标，输出 `dist/obsidian-plugin/`：

- `main.js`：入口 `packages/obsidian-plugin/src/main.js`，CJS 格式，`obsidian`、`electron`、`@codemirror/*` 设为 external。React、pinyin、jyutping 和音频样本全部打进同一个文件。
- `styles.css`：构建时由 `CSS + gameCSS + theme` 生成，插件不在运行时插入 `<style>`。
- `manifest.json`：版本号来自包内 `manifest.json`。
- 附带 `LICENSE`、`THIRD_PARTY_NOTICES.md`。

官方安装器只下载 `main.js`、`manifest.json`、`styles.css`，所以不能像 DSH 那样拆成多个 chunk 文件。预计 `main.js` 约 1.5 MB。为减少启动开销，拼音、粤拼和音频通过 `import()` 引入，由 esbuild 包装成延迟执行的模块，只在首次需要时运行；插件 `onload` 只注册视图和命令，不创建 React 树。

构建检查（加入现有测试）：

- Obsidian 产物不含 `packages/dsh-plugin/` 和 `apps/web/` 的源码。
- 除 external 外没有 `node:` 或其他运行时导入（保证手机端可用）。
- 不含正则后向断言（iOS 16.4 以下不支持）。
- 网页和 DSH 产物不含 `packages/obsidian-plugin/`。

`npm run build` 默认同时构建三个目标；`npm run dev` 增加可选的 Obsidian 监听构建，输出可软链接到测试笔记库的 `.obsidian/plugins/typefeel/`。（监听构建未实现：目前用 `npm run build:obsidian` 重新构建，再在 Obsidian 中停用并启用插件。）

## 手机端

`isDesktopOnly: false`。共享代码已有移动端键盘与视口处理，笔记库语料不依赖 Node。手机输入法的候选框位置、软键盘遮挡和落字游戏的触控只能在真机上验证；如果第一版来不及验证，就先发布为仅桌面（`isDesktopOnly: true`），之后再放开。

## 实施阶段

1. **共享重构**：`prose.js` 抽取，DSH 改为导入。`npm run build`、`npm test` 通过，DSH 行为不变。
2. **最小可用版本**：视图、主题、内置语料练习、落字游戏、命令、构建目标和构建检查。在桌面 Obsidian 中验证中英粤输入、输入法、窄宽视图、深浅主题、中英文界面。
3. **笔记库语料**：`vault-corpus.js`、`markdown.js`、文件夹选择（设置对话框与插件设置页）、`unconfigured` 提示；"用选中内容练习"及 `startWithText`。补充语法清理、文件夹过滤和未选文件夹的单元测试。
4. **收尾**：游戏 Mod+P 的 `Scope` 处理、手机端验证、`npm run export:obsidian -- /staging/path`（照 `export:plugin`，只导出到暂存目录，不改分发仓库）。2026-11-12：`Scope` 与导出脚本完成；手机端验证未做。

## 验证

- 每个阶段执行 `npm run build` 和 `npm test`。
- 用测试笔记库加载 `dist/obsidian-plugin` 做真实检查。可以用 `--remote-debugging-port` 启动 Obsidian 以便自动化检查 DOM 和控制台；输入法候选框位置需人工确认并记录在 `docs/verification/`。
- 回归：网页和 DSH 的输入流程各抽查一次，确认共享代码改动没有影响它们。

## 发布渠道

两种渠道都基于同一个公开 GitHub 仓库的 Release，Release 附带 `main.js`、`manifest.json`、`styles.css` 三个文件，tag、Release 名称和 `manifest.json` 中的版本号必须一致。区别在于用户怎么拿到插件，以及要不要经过审核：

| | BRAT 测试分发 | 社区目录（正式发布） |
|---|---|---|
| 用户怎么安装 | 先安装 BRAT 插件，再手动填仓库地址 | 在 Obsidian 的社区插件里搜索安装 |
| 审核 | 不需要 | 在 community.obsidian.md 提交，先自动审核，并受开发者政策约束 |
| 仓库要求 | 只看 Release，根目录可以没有 `manifest.json` | 默认分支根目录必须有 `README.md`、`LICENSE`、`manifest.json`，目录以根目录的 `manifest.json` 为准 |
| 版本 | 可以用 `0.1.0-beta.1` 这类预发布版本，可以锁定某个版本 | 只能用 `x.y.z`；Obsidian 根据根目录 `manifest.json` 的版本号检查更新 |
| 更新 | 由 BRAT 检查并安装 | 所有用户在 Obsidian 内收到更新 |
| 适合 | 少量测试者、手机端验证 | 公开发布 |

官方文档的建议也是先用 BRAT 给测试者试用，再提交社区目录。所以它们不是二选一，而是先后两个阶段，用的是同一个分发仓库。

建议：

- 新建公开分发仓库（暂定 `yishan/typefeel-obsidian`），内容只有构建产物、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md` 和记录源码 revision 的 `SOURCE.json`，做法与 DSH 分发仓库相同。不在 `typefeel` 主仓库直接发布，原因是：主仓库根目录放 Obsidian 的 `manifest.json` 不合适；BRAT 按版本号取"最新" Release 时会和其他发布混在一起。
- `npm run export:obsidian -- /staging/path` 导出成分发仓库的目录结构，只导出到暂存目录，不推送。
- 测试阶段：只发 GitHub 预发布版本（`0.1.0-beta.N`），不提交默认分支上 `manifest.json` 的版本号，以免社区目录或 Obsidian 提前识别到新版本。
- 正式阶段：提交根目录 `manifest.json` 并发布 `0.1.0`，然后在 community.obsidian.md 提交。BRAT 测试者装的预发布版本不会被 Obsidian 自动升级到同号正式版，需要在 BRAT 里更新一次，或者等下一个版本。
- 审核相关：README 写明不使用网络、不收集数据、只读取用户选定的文件夹，并链接 `typefeel` 源码。开发者政策禁止为隐藏意图而混淆代码；`main.js` 默认压缩，如果自动审核对此有意见，就改为发布未压缩版本。

以上每一步（建仓库、发 Release、提交目录）都对外可见，需要另行确认后执行。

## 待定问题

1. ~~分发仓库名称~~：已定为 `yishan/typefeel-obsidian`（2026-11-12）。
2. 第一版是否标记为仅桌面：取决于发布前能否完成手机真机验证。目前 `isDesktopOnly: false`，手机端未测。
