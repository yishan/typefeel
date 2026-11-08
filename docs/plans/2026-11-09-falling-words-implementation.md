# Falling Words Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `codex/falling-words-game` 交付网页版可试玩的中文落字游戏，完整输入后发射发光光标，生命归零结算，等待用户试玩后决定是否合并。

**Architecture:** 游戏逻辑与 UI 均位于权威源码 `packages/practice/src/game`。原生输入缓冲区的共用文本差异计算提取为共享模块，练习判分与游戏匹配各自保留。网页按需加载游戏，并在网页壳层切换模式；游戏与练习只挂载一个，防止快捷键冲突。

**Tech Stack:** 现有 React、DOM、CSS、esbuild、Node test runner；不增加运行依赖。

**执行结果：** 首版实现、构建、232 项测试及浏览器流程/尺寸检查通过。原生系统输入法候选窗和真实手机软键盘仍待人工验收。详见 [试玩验证记录](../verification/2026-11-09-falling-words.md)。

---

### Task 1: 确定性引擎与词表

Files: `data/game-words.json`, `packages/practice/src/game/engine.js`, `tests/game.test.js`.

1. 写测试，覆盖出生前缀冲突、整词与分次输入、批量消费、触底时间边界、生命归零、暂停、低帧率和新局隔离。
2. 运行 `node --test tests/game.test.js`，确认缺少实现导致失败。
3. 实现可注入时钟参数和随机数的引擎，制作受检查的常用中文单字和双字词表。
4. 运行同一测试文件，验证规则。

### Task 2: 原生文本与提交消费

Files: `packages/practice/src/native-input.js`, `packages/practice/src/create-practice.js`, `tests/native-input.test.js`.

1. 写缓冲区差异与输入消费测试，包括重复通知、连续相同词语、删除替换和组字取消。
2. 确认测试因缺少实现失败，再提取共用字符与差异函数。
3. 游戏输入使用原生文本框和组字事件；只在组字结束后消费确认文本，避免直接拼接 `event.data`。
4. 回归现有练习输入和插件测试。

### Task 3: 游戏场景和网页入口

Files: `packages/practice/src/game/create-game.js`, `packages/practice/src/game/styles.js`, `packages/practice/src/game/records.js`, `apps/web/src/main.js`, `apps/web/src/web.css`, `tests/game-records.test.js`, `tests/web.test.js`.

1. 添加独立游戏成绩的失败测试；实现有版本校验、容量限制和存储失败反馈的记录。
2. 实现准备、倒数、进行、暂停和结算界面；用真实文本框，文字与发光光标子弹使用独立 DOM 元素。
3. 帧循环更新目标和子弹位置；离散状态变化交给 React。处理焦点丢失、切后台、尺寸变化与软键盘可视区。
4. 网页增加模式切换和游戏懒加载，沿用现有主题与中英文界面；首版游戏词库为中文。
5. 检查网页和插件构建边界，确保游戏仅由网页入口引用。

### Task 4: 试玩验证与交付

1. 运行 `npm run build`、`npm test`。
2. 打开本地浏览器，验证开始、发射、连击、触底扣血、结算、暂停继续、Escape、模式切换、主题和存储。
3. 检查桌面、窄屏和软键盘视口下的目标、底线及输入框。
4. 检查组字不发射、整词及分次提交、重复事件、取消组字和重开后的迟到事件。操作系统输入法候选窗需要原生输入验证，并明确记录验证边界。
5. 更新 README 和试玩验证文档，提交本地功能分支，保留可访问的本地试玩服务，不合并或发布。
