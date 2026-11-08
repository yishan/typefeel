<p align="center"><img src="apps/web/public/icon.svg" width="64" height="64" alt="Type Feel"></p>

# Type Feel · 字感

[简体中文](README.md) | **English**

A focused typing practice app for English, Mandarin Chinese and Cantonese. Use your own input method. Keep your practice records on your device.

[Start practicing](https://typefeel-seven.vercel.app)

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

## Text and privacy

The app includes **288 original passages**: 96 per language, with 32 short, 32 medium and 32 long passages. Text, pronunciation dictionaries and sounds ship with the app. Practice does not call a model or upload what you type. Settings and statistics stay in your browser; clearing site data also clears them.

The website uses built-in passages. The DSH plugin can additionally select recent conversations from the current local DSH profile. Website and plugin records are separate and do not sync automatically. Initial access requires a network connection; offline installation is not included in this release.

## DSH plugin

This repository also builds [dsh-typing-practice](https://github.com/yishan/dsh-typing-practice) from the same practice source. The plugin keeps its existing GitHub and npm installation paths, local conversation access and platform shortcuts.

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
