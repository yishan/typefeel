# Offline practice passages

`passages.json` is the editable source of the built-in practice corpus. It contains **288 complete texts: 96 per language, with 32 short, 32 medium, and 32 long**. Each language has 32 scenes, each with three length variants. These are 96 selectable texts per language, not 96 unrelated stories.

The original short passages and their IDs are preserved. Medium versions continue the same event; long versions add further detail and subsequent events. Each version ends at a complete sentence and can be practised on its own. The relationship is explicit in `family`; the runtime never generates a continuation or joins unrelated passages to create a medium/long article.

All prose was written for this project during development with coding-assistant assistance and is distributed under the repository's [MIT license](../LICENSE). No third-party excerpts, downloaded corpora, or user conversations are included. Automated checks are not independent native-language editing.

## Length policy

English is measured in words. Chinese and Cantonese use visible graphemes, including ordinary punctuation and Latin characters. The shared policy lives in `src/passage-lengths.js` and applies to built-in articles and local-conversation extraction.

| Tier | English permitted words | Chinese/Cantonese permitted graphemes | Entries per language |
|---|---:|---:|---:|
| `short` | 40–79 | 80–159 | 32 |
| `medium` | 80–139 | 160–279 | 32 |
| `long` | 140–220 | 280–440 | 32 |

Actual corpus ranges:

| Language | Short | Medium | Long |
|---|---:|---:|---:|
| English | 53–58 words | 94–103 words | 156–172 words |
| Simplified Chinese | 100–113 graphemes | 187–208 graphemes | 325–345 graphemes |
| Traditional written Cantonese | 97–107 graphemes | 180–199 graphemes | 328–361 graphemes |

Each tier covers travel, food, work, learning, reading, home, hobbies, and nature, with four scenes per topic. Cantonese is written as Cantonese prose, not Mandarin with Cantonese pronunciation labels.

## Data and selection

An entry has `id`, `language`, `topic`, `family`, `length`, and `text`. A short ID such as `zh-work-02` is also the family ID. Its medium and long variants are `zh-work-02-medium` and `zh-work-02-long`. Metadata is prepared for subsequent filtering and content features without exposing new source-selection settings.

`selectPassage(language, { length, recent, random })` returns one whole text with `passageId`, `ids`, `length`, and `topic`. It prefers a scene whose family is not represented among recent IDs. If all scenes have been seen, it selects the least recently used family. A recent short version excludes the corresponding medium and long versions too.

`selectPractice(language, recent, minChars, random)` retains timed practice's existing short-text pool and difficulty. It shuffles topic order and selects whole short paragraphs until the run contains at least 1,200 UTF-16 code units. No paragraph repeats within a run. It also avoids scenes recently used in passage mode. The short texts and scoring rules have not changed, so the timed-record corpus family remains `version: 2`; `revision: 3` identifies this content expansion.

The build embeds the corpus and selector in the marked `GENERATED PRACTICE CORPUS` block in `client.js`. Selection is synchronous and offline, with no runtime model invocation, API key, remote generation, translation request, or external text fetch. Pronunciation dictionaries remain separate local chunks.

## Local conversations

The Host accepts `mode=passage|timed` (default `passage`) and `length=short|medium|long` (default `short`). Timed mode accepts only `short`. It normalizes text before splitting sentences, checking lengths, annotating, or computing SHA-256 fingerprints. Rejected sentences are boundaries; short fragments on either side are not silently joined. Each candidate comes from one message and retains its requested length metadata. Searches rotate independently for each language, mode, and length.

The existing limits remain: a 30-day message window, up to 30 chats per request, and an eight-second cooperative cancellation budget. The current passage, or all excerpt hashes in the current timed batch, is excluded; up to 16 recent canonical hashes are deprioritized. If only recent matches remain, the oldest eligible match is reused. If there is no suitable result, the Client uses built-in text for the same language and selected preset and keeps the local-source preference.

Timed requests collect complete, distinct short excerpts before practice starts, within the same 30-chat/eight-second limits. Fresh excerpts are preferred; recent ones are reused only if needed after the bounded search. At least 1,200 UTF-16 units must be available, or the entire run falls back to built-in text. There is no runtime continuation fetch, repeated-text padding, or mixture of built-in and local prose. The response includes the combined text hash and individual excerpt hashes; chat titles and positions are omitted for a timed batch. Each excerpt still satisfies the single-message extraction rule.

Near-duplicate text is filtered within an extraction. Cross-request local recency uses exact hashes, so selecting a different-length excerpt from the same message is not the same as built-in family deduplication. Conversation bodies are not persisted. Original Markdown line references remain source references; `cleanStart` and `cleanEnd` refer to the normalized prose run, not raw Markdown offsets.

## Records and editing rules

Passage-mode history stores the selected `length`, statistics, and either a built-in `passageId` or a local text fingerprint. Built-in same-passage comparison also includes the corpus version, language, and hint mode. A short article and its expanded version have different identities. They do not update timed bests. Local timed bests use a separate `local` source key, while built-in bests retain their existing keys. History records the actual source, including a built-in fallback. Restarting or changing hints preserves the current article; selecting another length or clicking “New passage” selects another scene.

- Use ordinary daily-life prose with a clear subject, event, and ending. Avoid text that requires an absent screenshot, code block, list, or earlier answer.
- Use English `"` and `'`, Chinese and Cantonese `“”`. Avoid corner quotes, hotkey glyphs, mathematical notation, URLs, paths, decorative symbols, emoji, and invisible formatting characters.
- Keep simple mixed Latin text when it belongs naturally in the scene, such as `PDF` or `A4`. The Client renders Latin letters, digits, and ASCII punctuation in the same monospace stack as English practice. Han text and ruby readings retain their existing fonts.
- Write a coherent continuation for each scene. Do not pad a long version with repeated sentences or unrelated paragraphs. Retain the shorter version as the prefix so the relationship can be checked.
- Keep IDs stable for unchanged text. Changing an article already used for same-passage records requires a new identity or an explicit corpus-version migration. A content revision alone must not make changed text compare with earlier records as though it were identical.
- The Client accepts record corpus versions 1 and 2. Introducing another scoring family requires updating migration and preserving earlier records; adding content alone does not justify dropping old scores.
- If third-party prose is introduced later, record its exact source, revision, author, text license, and attribution. A software repository's license is not sufficient evidence for every bundled text. Update the provenance schema before mixing sources.

## Validation and build

```sh
npm run check:corpus
npm run build
npm test
```

Validation checks canonical typography, allowed characters, IDs, family membership, three-tier coverage, length bounds, language features, paired punctuation, complete endings, obvious context-dependent openings, and near duplicates between different scenes. Each tier must contain at least 32 entries and eight topics. Intentional variants within a family are checked for their prefix relationship rather than rejected as duplicates.

Tests cover the embedded artifact, selection and exhaustion, recency across length changes, full reading alignment and coverage, local extraction, cancellation, preference persistence, passage completion beyond the timed deadline, retry identity, and legacy-record preservation. Reading coverage does not establish that every contextual pronunciation is correct. Semantic and native-language review remain part of maintaining the content.

Do not edit the generated block in `client.js` by hand. Commit the data, selectors, policy, tests, and rebuilt client together. The installable package contains the embedded corpus and Host policy modules; the authoring JSON remains in this repository.
