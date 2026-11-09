# dsh-typing-practice 0.2.1

日期：2026-11-09

## 修复

- 游戏模式标题处的字感图标与练习模式保持一致。此前游戏模式完整显示图标留白，图中 Aa 偏小；现在两种模式按同一比例裁切，窄屏下的小尺寸图标也一致。

插件模块名、侧栏入口、练习与游戏记录键均保持不变。

## 验证与发布产物

发布通过 `npm run export:plugin` 从干净的源码提交导出，包含完整构建和 256 项测试，并通过 `SOURCE.json` 记录源码版本。GitHub 与 npm 使用同一打包文件。图标尺寸已在网页的练习与游戏模式中核对；本次未在真实 DSH 宿主中重新验收。

## English

- The header icon in Game mode now matches Practice. Game mode previously showed the icon's full margin, which made the Aa look smaller; both modes now crop it by the same ratio, including the smaller icon on narrow panels.

Module identity, the sidebar entry and practice and game record keys are unchanged.
