# Third-party notices

Type Feel and its original practice passages are licensed under [MIT](LICENSE).
The practice implementation was migrated from
[dsh-typing-practice](https://github.com/yishan/dsh-typing-practice), also MIT.

| Component | Use | License |
| --- | --- | --- |
| React / React DOM / Scheduler | Standalone website rendering | MIT |
| pinyin-pro | Contextual Mandarin Pinyin | MIT |
| to-jyutping | Cantonese Jyutping | MIT |
| mdast-util-from-markdown and its dependencies | DSH local conversation parsing | MIT |
| kbsim / Thomas Lai | Mechanical keyboard recordings | MIT |

Exact dependency versions are pinned in `package-lock.json`. Audio revisions and
checksums are recorded in [the audio manifest](assets/audio/kbsim/manifest.json);
the upstream license is retained in [assets/audio/kbsim/LICENSE.md](assets/audio/kbsim/LICENSE.md).

The build reads the licenses of all bundled libraries and includes their full
text in `dist/web/THIRD_PARTY_NOTICES.txt` and
`dist/dsh-plugin/THIRD_PARTY_NOTICES.md`. The web-only build contains no DSH Host
parser. Product names identify source recordings and imply no affiliation.
