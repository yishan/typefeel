<p align="center">
  <img src="icon.svg" width="72" height="72" alt="Typing practice icon">
</p>

# dsh-typing-practice

[简体中文](README.md) | **English**

A typing practice plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI. Practice English, Chinese or Cantonese using built-in passages or recent local conversations. Type with your own input method, view Pinyin or Jyutping hints, track speed and accuracy in real time, and choose mechanical keyboard sounds. Personal bests and practice history are saved in your local browser.

> An unofficial DeepSeek Harness plugin.

## Features

| Feature | Description |
|---|---|
| Languages | English, Simplified Chinese and Cantonese in Traditional Chinese, independent of the interface language |
| Text sources | 96 original passages per language, or excerpts from local conversations within the past 30 days |
| Practice modes | Timed runs of 15, 30 or 60 seconds, or complete short, medium or long passages |
| Input | Use your own input method, with optional Pinyin or Jyutping hints for Chinese and Cantonese |
| Live feedback | An immersive text area with the current line held at a fixed height and surrounding lines fading toward the edges |
| Statistics | Speed, accuracy, errors and time above the text; WPM for English and characters per minute (CPM) for Chinese and Cantonese |
| Records | Local personal bests and the latest 100 runs, with language filters, records for the same passage and an option to clear records |
| Settings | Cursor, pronunciation hints and keyboard sounds in one place; preferences are saved in your local browser |
| Interface | Chinese and English, following the DSH interface language and light or dark theme |

## Passages and practice modes

The built-in collection contains **288 passages: 96 per language, with 32 short, 32 medium and 32 long passages**, covering eight topic areas. Each language has 32 scenarios, each with three complete length variants. Medium passages develop the events further, while long passages add detail and follow-up events. Each version can be practised on its own. Chinese passages use Simplified Chinese; Cantonese passages use colloquial Cantonese written in Traditional Chinese.

| Length | English words | Chinese / Cantonese visible characters | Passages per language |
|---|---:|---:|---:|
| Short | 40–79 | 80–159 | 32 |
| Medium | 80–139 | 160–279 | 32 |
| Long | 140–220 | 280–440 | 32 |

Choose a language and practice mode at the bottom of the page: `English / Chinese / Cantonese | 15s / 30s / 60s | Short / Medium / Long`. Select one language and one practice mode. The initial practice language matches the DSH interface language.

Pinyin and Jyutping dictionaries are bundled with the plugin and loaded locally, without a remote pronunciation service. If loading fails, retry or turn hints off to continue.

In **Settings → Pronunciation**, choose how many hints to show and whether Chinese hints use full Pinyin or Shuangpin. Full Pinyin is the default. Shuangpin offers Xiaohe, Ziranma, Microsoft and Sogou layouts; choose the one used by your input method. Preferences are saved locally and applied when you switch to Chinese. Cantonese continues to use Jyutping.

### Local conversation passages

Select **Local conversations** at the bottom of the page to find text for the selected English, Chinese or Cantonese mode. Click **New passage** to select another excerpt. The plugin remembers your text source; the initial source is **Built-in text**. If no suitable local content is available, it switches back to built-in text automatically.

Local passages come from user messages and completed model replies within the past 30 days in the current DSH profile. Both roles are included. Short, medium and long modes select complete excerpts within the ranges above; timed mode prepares the required text before the run starts.

## Keyboard sounds

Open **Settings** in the top-right corner and find the **Sound** section. Choose Cherry MX Blue, Cherry MX Brown, NovelKeys Cream or Holy Panda. Click **Preview** to listen and use the volume slider to adjust the level. Sound is off by default, with an initial volume of 30%; your sound and volume choices are saved automatically. Settings are unavailable during a run. Finish or restart the run to make changes.

The four sound packs use MIT-licensed recordings from [kbsim](https://github.com/tplai/kbsim) and are bundled with the plugin. They capture specific keyboard setups; they do not represent every keyboard using the same switches. See [third-party notices](THIRD_PARTY_NOTICES.md) for sources and licenses.

## Common controls

- Click the text or focus it with `Tab` to start typing. Use your own input method to enter Chinese or Cantonese text.
- **Restart** or `Esc`: practise the same text again.
- **New passage**: use `⌘ R` on macOS or `Ctrl+R` on Windows / Linux. Hover over the button to see its shortcut.
- **Cycle options**: use `⌘ T` for language, `⌘ D` for duration and `⌘ L` for passage length on macOS. Use `Ctrl` instead of `⌘` on Windows / Linux. Hover over an option group to see its shortcut.
- **Records**: view personal bests and practice history after finishing or restarting a run.
- Press `Esc` to close a dialog. Use `Tab` / `Shift+Tab` to move between controls.

## Installation

This plugin is a DSH bundle. Install it from GitHub in plugin management:

```text
https://github.com/yishan/dsh-typing-practice
```

If the `dsh` CLI is available, install it from npm:

```bash
dsh plugin --profile <profile> add dsh-typing-practice
```

You can also install from GitHub through the CLI:

```bash
dsh plugin --profile <profile> add github:yishan/dsh-typing-practice
```

Refresh the DSH Web UI after installation. **Typing practice** will appear in the left sidebar. The Host, pronunciation engines and sounds are bundled. Installation needs no source checkout, manual dependency installation or build step. The plugin is installed in the selected DSH profile and is available to all chats in that profile.

After updating, turn **Typing practice** off and on again in plugin management, then refresh the page. Use `plugin_manager` to uninstall it.

## License

[MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the versions, sources and licenses of bundled pronunciation dependencies and keyboard recordings.

---

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
