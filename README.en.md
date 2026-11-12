<p align="center"><img src="apps/web/public/brand/icons/icon.svg" width="64" height="64" alt="Type Feel"></p>

# Type Feel · 字感

[简体中文](README.md) | **English**

A focused typing practice app for English, Mandarin Chinese and Cantonese. Use your own input method. Keep your practice records on your device.

[Start practicing](https://typefeel.app)

## Practice

Choose a language and a test, then click the passage or focus it with `Tab`.

- **Three languages:** English, simplified Chinese and conversational Cantonese in traditional characters.
- **Six presets:** 15 / 30 / 60 seconds, or short / medium / long passages.
- **Immersive text:** the current line stays in place while surrounding text fades away.
- **Pronunciation:** Pinyin, Jyutping, and Xiaohe / Ziranma / Microsoft / Sogou Shuangpin hints.
- **Typing feel:** cursor shapes, a blue glow, blinking and four mechanical keyboard sound packs.
- **Local records:** live speed and accuracy, personal bests and the last 100 practice sessions.

Press `Esc` to restart the current passage. Click “New text” to change it. Browser Cmd/Ctrl shortcuts keep their normal behavior. During composition, Escape remains available to your input method.

Settings include cursor, pronunciation, sound, interface language and light / dark appearance. On first visit the interface follows your browser language (Chinese or English), and appearance follows your system. Your choices are remembered locally.

## Web game

Choose Practice or Game at the top of the website, then choose Start to begin a round. The local game URL is `http://127.0.0.1:4173/#game`.

Chinese characters and words fall from above. Each confirmed input must exactly match one whole target to fire a glowing cursor. Extra characters, partial words and concatenated targets do not match. The input clears after every commit. Each missed target costs one life; the remaining life bars turn red at two lives or fewer, and five misses end the round. Difficulty increases every 30 seconds of survival.

The initial level uses the earlier preview's level 3 difficulty: a 2.16-second spawn interval, 8.2 seconds for a single-character target to fall, and a six-target limit. Level and combo appear on the left of the HUD, lives in the center, and score on the right. The harder rules have a separate best score, while earlier records are preserved.

Click Pause or press Escape or Ctrl/Cmd+P to pause, then choose Continue to resume. Leaving the input or hiding the page pauses automatically. Pause to switch modes. During composition, candidate keys stay available to your input method. Game settings explain the controls and difficulty levels.

Game sounds provide short hit and landing cues. Keyboard sounds reuse practice's four local recording packs: Cherry MX Blue, Cherry MX Brown, NovelKeys Cream and Holy Panda. Keyboard pack, mute and volume choices sync with web practice. Each sound group has its own switch, volume and preview. Pausing, hiding or leaving the game stops playback. The best score and last 20 round results stay in your browser, separate from practice records. The first game corpus contains 120 Chinese characters and two-character words.

See the [difficulty, layout and audio verification](docs/verification/2026-11-09-falling-words-audio.md) for current coverage and limits.

## Text and privacy

The app includes **288 original passages**: 96 per language, with 32 short, 32 medium and 32 long passages. Text, pronunciation dictionaries and sounds ship with the app. Practice does not call a model or upload what you type. Settings and statistics stay in your browser; clearing site data also clears them.

The website uses built-in passages. The DSH plugin can additionally select recent conversations from the current local DSH profile, and the Obsidian plugin can use notes from folders you choose. Website and plugin records are separate and do not sync automatically. Initial access requires a network connection; offline installation is not included in this release.

## DSH plugin

This repository also builds [dsh-typing-practice](https://github.com/yishan/dsh-typing-practice) from the same practice source. The plugin keeps its existing GitHub and npm installation paths, local conversation access and platform shortcuts.

The plugin provides the same Practice / Game switch from version 0.2.0. The game fits the DSH panel, follows its language and theme, shares keyboard sound settings with practice inside DSH, and stores game records separately. See the [plugin guide](packages/dsh-plugin/README.en.md).

## Obsidian plugin

`packages/obsidian-plugin` brings the same practice and falling words game to an Obsidian tab, following Obsidian's language and theme. You can practice notes from folders you choose, or a selection in the editor. It makes no network requests and reads no notes until you choose a folder. The plugin is in testing and will first be installable with BRAT from the distribution repository `yishan/typefeel-obsidian`. See the [plugin guide](packages/obsidian-plugin/README.md).

## Run locally

Requires Node.js 22.12 or later.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. Restart the development command after edits, or run `npm run build` and refresh.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the shared source and release workflow.

## License

[MIT](LICENSE). Keyboard recordings are from [kbsim / Thomas Lai](https://github.com/tplai/kbsim). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); build artifacts include full third-party licenses.
