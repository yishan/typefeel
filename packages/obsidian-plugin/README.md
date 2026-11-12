# Typefeel for Obsidian

**English** | [简体中文](README.zh-CN.md)

Typing practice for Chinese, Cantonese and English inside Obsidian. You type with your own input method, and practice text can come from your own notes.

Built from [typefeel](https://github.com/yishan/typefeel), the same source as [typefeel.app](https://typefeel.app) and the DSH plugin.

## Features

- **Practice**: 15, 30 or 60 second runs, or short, medium and long passages. The current line stays in place while the text around it fades.
- **Falling words game**: Chinese characters and words fall from the top. Commit a whole target with your input method to clear it.
- **Your notes as text**: choose folders in your vault, and passages are picked from the notes in them. You can also practice a selection from the editor.
- **Hints and sound**: pinyin, jyutping and shuangpin hints, cursor styles and keyboard sounds recorded from real switches.
- **Local records**: best scores, recent runs and game results stay on this device.
- The interface follows Obsidian's language (Chinese or English) and theme.

## Use

- Click the keyboard icon in the ribbon, or run **Open typing practice** or **Open falling words game** from the command palette.
- To practice your own notes, add folders under **Settings → Typefeel → Note folders**, or in the Typefeel settings dialog. Then choose **My notes** as the text source. Until you add a folder, no notes are read.
- To practice part of a note, select the text and run **Practice typing the selection** from the command palette or the editor's context menu.

Commands have no default hotkeys; you can assign your own under **Settings → Hotkeys**.

In practice, press `Esc` to restart the current text. In the game, press `Esc` or `Cmd/Ctrl+P` to pause. While a game is running and focused, `Cmd/Ctrl+P` pauses it instead of opening the command palette; once paused, it opens the command palette as usual. While your input method is composing, it keeps its own key handling.

## Privacy

- No network access. The plugin makes no requests and collects no data.
- Notes are read only from the folders you choose, on this device, and only to pick practice text. Their contents are not saved or uploaded.
- Records store a fingerprint of each passage, never note paths or text.
- Preferences and records are kept in Obsidian's local storage on this device and are shared by your vaults on it; they do not sync. The folder list is saved per vault in the plugin's `data.json`.

## Install

The plugin is in testing. Install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat) using the repository `yishan/typefeel-obsidian`. It requires Obsidian 1.8.7 or later.

Mobile has not been tested yet.

## Source and license

This repository holds release builds only. Source, issues and changes live in [yishan/typefeel](https://github.com/yishan/typefeel); `SOURCE.json` records the source revision of each build. `main.js` is generated and minified.

[MIT](LICENSE). Keyboard recordings come from [kbsim / Thomas Lai](https://github.com/tplai/kbsim). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
