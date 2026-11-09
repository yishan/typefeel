# dsh-typing-practice 0.2.0

日期：2026-11-09

## 更新

- 在现有「打字练习」面板顶部增加居中的「练习 / 游戏」切换。
- 新增中文落字游戏：整字或整词上屏后自动发射蓝色光标。每次上屏必须完整匹配一个目标；多字、少字均不匹配，上屏后清空输入框。
- 提供生命、等级、连击、分数和独立游戏记录。共五条生命，剩余两条及以下显示红色；每存活 30 秒提升一级。
- Esc、Ctrl/Cmd+P 暂停。失焦、隐藏和面板尺寸变化时暂停，离开面板后清理音频、动画和快捷键。
- 命中及落地音效独立开关和调节音量；四种键盘音效与 DSH 练习同步设置。
- 跟随 DSH 中英文界面和亮暗主题，按面板尺寸布局；游戏发射器、子弹、光晕和输入光标与练习使用相同蓝色。
- 修复语言服务初始化顺序和暗色主按钮文字对比度。中文练习副标题简化为「实时统计打字速度与准确率」。

插件模块名、侧栏入口及已有练习记录键保持稳定。游戏使用随包词库，不调用模型，不读取本地对话作为目标词库。

## 验证与发布产物

发布通过 `npm run export:plugin` 从干净的源码提交导出。导出包含完整构建和 256 项测试，并通过 `SOURCE.json` 记录源码版本。GitHub 与 npm 使用同一打包文件。

真实 DSH 0.2.2-rc.1 Web 宿主中的输入、音效、模式切换、快捷键服务、成绩、亮暗主题及窄屏验证见[验证记录](../verification/2026-11-09-dsh-falling-words.md)。原生系统输入法候选窗、手机软键盘及桌面原生菜单转发保留记录中的人工验收边界。

## English

- Adds a centered Practice / Game switch inside the existing Typing practice panel.
- Adds falling Chinese characters and words. Confirm one exact target to fire a blue cursor; extra or missing characters do not match, and the input clears after every commit.
- Includes five lives, increasing difficulty, combos, scores and separate local game records.
- Escape or Ctrl/Cmd+P pauses. Leaving the input, hiding or resizing the panel pauses automatically; leaving the panel releases audio, animation and shortcuts.
- Adds independent hit and landing cues, plus the existing four keyboard packs with settings shared with DSH practice.
- Follows DSH language, theme and panel size. Game cursors use the same blue as practice. Fixes locale initialization and dark-theme button contrast.

Existing module identity and practice records are preserved. Game targets come from the bundled word list without model calls or local conversation access. Artifacts are self-contained and include their source revision in `SOURCE.json`.
