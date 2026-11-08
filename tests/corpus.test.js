import assert from 'node:assert/strict';
import test from 'node:test';
import { proseRuns, splitPassages, measure, extractPassages } from '../packages/dsh-plugin/src/corpus.js';
import { registerCorpusRoutes } from '../packages/dsh-plugin/src/corpus-routes.js';
import { entries } from '../packages/practice/src/practice-text.js';

const zh = '周末我们准备沿着河边散步，看看附近的小店。出门前记得带好雨伞和水，途中可以找个安静的地方休息。大家不必赶时间，慢慢欣赏路上的风景，聊一聊最近遇到的事情。等到太阳下山，我们再一起回家做饭。';
const yue = '我哋今日諗住早啲出門，去河邊行下睇下風景。你記得帶遮同水，行到攰就搵間茶餐廳坐低飲杯嘢。唔使急住趕路，大家慢慢行，傾下最近遇到嘅事情。等到太陽落山，我哋先一齊返屋企煮飯，食完再收拾廚房。';
const en = 'We plan to walk along the river this weekend and visit the small shops nearby. Before leaving home, bring some water and an umbrella. There is no need to hurry because we can sit somewhere quiet, enjoy the view, and talk about the things we have learned this week.';
const user = (seq, text = zh, source = 'user') => ({ seq, time: Date.now() - 1000, type: 'user/message', data: { id: `u${seq}`, role: 'user', source: { kind: source }, content: [{ type: 'text', text }] } });
const assistant = (seq, text = zh, turn = 1) => ({ seq, time: Date.now() - 1000, type: 'assistant/message', data: { turn, step: 0, stream: [], message: { id: `a${seq}`, role: 'assistant', source: { kind: 'model' }, content: [{ type: 'text', text }] } } });
const end = (turn = 1, kind = 'completed') => ({ type: 'turn/end', data: { turn, reason: { kind } } });
const options = (extra = {}) => ({ sessionId: 'selected', language: 'zh', since: Date.now() - 30 * 86400000, until: Date.now(), ...extra });

test('extracts only human text and completed model replies, never context, reasoning, tool output or failed attempts', async () => {
  const reply = assistant(3, entries.find(entry => entry.id === 'zh-food-01').text);
  reply.data.message.content.unshift({ type: 'reasoning', text: 'PRIVATE REASONING ' + zh });
  const toolReply = assistant(4, 'TOOL ' + zh);
  toolReply.data.message.content.push({ type: 'tool-call', name: 'exec', arguments: '{}' });
  const events = [user(0), user(1, 'INJECTED ' + zh, 'plugin'), reply, toolReply,
    assistant(5, 'UNFINISHED ' + zh, 2), assistant(6, 'ABORTED ' + zh, 3),
    { ...assistant(7, 'ATTEMPT ' + zh), type: 'assistant/attempt' },
    { type: 'tool/result', data: { content: [{ type: 'text', text: zh }] } }, end(), end(3, 'aborted')];
  const result = await extractPassages(events, options());
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map(c => c.source.role), ['assistant', 'user']);
  assert.ok(!JSON.stringify(result).match(/PRIVATE|INJECTED|TOOL|UNFINISHED|ABORTED|ATTEMPT/));
});

test('Markdown parser keeps prose and labels, isolates code, tables, HTML, attachments and suspect credentials', () => {
  const markdown = `# Heading\n\n**Hello** [friend](https://example.com).\n\nNext paragraph.\n\n\`\`\`txt\nPRIVATE CODE\n\`\`\`\n\nAfter code.\n\n| Name | Value |\n| --- | --- |\n| Private | Value |\n\n<div>PRIVATE HTML</div>\n\n![PRIVATE IMAGE](image.png)\n\nPassword: private-value\n\nVisit https://example.com/private\n\nContact secret@example.com\n\nRead /Users/person/private.txt\n\nSkip \`inline code\` too.\n\nFinal paragraph.`;
  assert.deepEqual(proseRuns(markdown).map(run => run.text), ['Hello friend. Next paragraph.', 'After code.', 'Final paragraph.']);
});

test('lengths count CJK graphemes and English words and preserve complete sentences', () => {
  for (const [language, text] of [['zh', zh], ['yue', yue], ['en', en]]) {
    const parts = splitPassages(text, language, 'short');
    assert.equal(parts.length, 1);
    assert.equal(parts[0].text, text);
    const count = measure(parts[0].text, language);
    assert.ok(count >= (language === 'en' ? 40 : 80));
    assert.ok(count <= (language === 'en' ? 100 : 200));
  }
  assert.equal(measure('𠮷é', 'zh'), 2);
  assert.deepEqual(splitPassages('太短。', 'zh', 'short'), []);
  assert.deepEqual(splitPassages('字'.repeat(201) + '。', 'zh', 'short'), []);
  const parts = splitPassages(zh.repeat(4), 'zh', 'short');
  assert.ok(parts.length >= 2);
  assert.ok(parts.every(part => measure(part.text, 'zh') <= 200));
  assert.ok(parts.every(part => part.text.endsWith('。')));
});

test('Cantonese filtering selects Cantonese originals and does not transliterate Mandarin', async () => {
  const result = await extractPassages([user(0, zh), user(1, yue), user(2, en)], options({ language: 'yue' }));
  assert.deepEqual(result.candidates.map(c => c.text), [yue]);
  assert.equal((await extractPassages([user(0, zh)], options({ language: 'yue' }))).candidates.length, 0);
});

test('deduplicates text and retains message, block, line and fingerprint provenance without merging messages', async () => {
  const result = await extractPassages([user(0, zh), user(2, zh)], options());
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].source.seq, 2);
  assert.equal(result.candidates[0].source.sessionId, 'selected');
  assert.equal(result.candidates[0].source.fingerprint.length, 64);
  assert.equal(result.candidates[0].source.lineStart, 1);
  assert.equal((await extractPassages([user(0, zh.slice(0, 50)), user(1, zh.slice(50))], options())).candidates.length, 0);
});

test('bounded extraction reports skipped oversized blocks and honors cancellation', async () => {
  const result = await extractPassages([user(0), user(1, '字'.repeat(20001))], options());
  assert.equal(result.limited, true);
  assert.equal(result.candidates.length, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(extractPassages([user(0)], options(), controller.signal), { name: 'AbortError' });
  await assert.rejects(extractPassages([], options({ language: 'system' })), /invalid_options/);
});

function host(overrides = {}, records = [{ header: { id: 'selected', createdAt: 1000 } }]) {
  let route;
  const reads = [];
  let disposals = 0;
  const query = {
    async listSessions() { return records; },
    async observeSession(id, settings) {
      reads.push({ id, settings });
      return { header: { id }, events: [user(0), end()], [Symbol.dispose]() { disposals++; } };
    }, ...overrides,
  };
  registerCorpusRoutes({ get: name => name === 'sessionQuery' ? query : { fetch: { register: value => { route = value; } } } });
  return { reads, disposals: () => disposals,
    request(query = 'language=zh', signal) { return route.fetch(new Request('http://localhost/api/typing-practice/recent?' + query, { signal })); },
  };
}

test('one request selects recent prose from both roles and releases observations, without returning raw logs', async () => {
  const app = host();
  const response = await app.request();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.candidate.text, zh); assert.equal(body.events, undefined);
  assert.equal(app.disposals(), 1);
  assert.equal(app.reads[0].settings.projectionMode, 'none');
  const excluded = await (await app.request('language=zh&exclude=' + body.candidate.source.fingerprint)).json();
  assert.equal(excluded.candidate, null); assert.equal(excluded.reason, 'empty');
});

test('30-day window uses message timestamps, includes active old chats and excludes stale or future messages', async () => {
  const past = user(0); past.time = Date.now() - 31 * 86400000;
  const future = user(1); future.time = Date.now() + 86400000;
  const current = user(2);
  const result = await extractPassages([past, future, current], options());
  assert.deepEqual(result.candidates.map(c => c.source.seq), [2]);
  const app = host({ async observeSession(id) { return { header: { id }, events: [past, current] }; } }, [{ header: { id: 'old-chat', createdAt: 1 } }]);
  assert.equal((await (await app.request()).json()).candidate.source.sessionId, 'old-chat');
});

test('search skips subagents and bad sessions, then advances to another chat on the next click', async () => {
  const reads = [];
  const app = host({ async observeSession(id) {
    reads.push(id);
    if (id === 'bad') throw new Error('PRIVATE PATH');
    return { header: { id }, events: [user(0, id === 'first' ? zh : zh.replace('周末', '明天'))] };
  } }, ['agent', 'bad', 'first', 'second'].map(id => ({ header: { id, origin: id === 'agent' ? 'subagent' : undefined } })));
  assert.equal((await (await app.request()).json()).candidate.source.sessionId, 'first');
  assert.deepEqual(reads, ['bad', 'first']);
  assert.equal((await (await app.request()).json()).candidate.source.sessionId, 'second');
});

test('missing service, no matching language, and corrupt history return automatic fallback reasons', async () => {
  assert.deepEqual(await (await host({ observeSession: undefined }).request()).json(), { candidate: null, reason: 'unavailable' });
  const response = await host({ async observeSession() { throw new Error('PRIVATE PATH'); } }).request();
  assert.deepEqual(await response.json(), { candidate: null, reason: 'read_failed' });
  assert.deepEqual(await (await host().request('language=yue')).json(), { candidate: null, reason: 'empty' });
  assert.equal((await host().request('language=__proto__')).status, 400);
});

test('cancellation reaches observations and frees bounded concurrency', async () => {
  const app = host({ observeSession: (id, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) });
  const a = new AbortController(), b = new AbortController();
  const one = app.request('language=zh', a.signal), two = app.request('language=zh', b.signal);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await (await app.request()).json()).reason, 'busy');
  a.abort(); b.abort();
  assert.equal((await (await one).json()).reason, 'timeout');
  assert.equal((await (await two).json()).reason, 'timeout');
  const c = new AbortController(); const three = app.request('language=zh', c.signal);
  await new Promise(resolve => setImmediate(resolve)); c.abort();
  assert.equal((await (await three).json()).reason, 'timeout');
});

test('bounded scans rotate rather than repeatedly reading the first 30 unsuitable chats', async () => {
  const reads = [];
  const app = host({ async observeSession(id) { reads.push(id); return { header: { id }, events: [] }; } }, Array.from({ length: 35 }, (_, i) => ({ header: { id: String(i) } })));
  assert.equal((await (await app.request()).json()).reason, 'limited');
  assert.equal(reads.length, 30);
  await app.request();
  assert.equal(reads[30], '30');
});

test('normalization precedes segmentation, sizing and fingerprinting for both quote styles', async () => {
  for (const [language, text] of [['en', en], ['zh', zh], ['yue', yue]]) {
    const quoted = language === 'en' ? '"' + text + '"' : '“' + text + '”';
    const alternate = '「' + text + '」\u200b';
    const one = await extractPassages([user(0, quoted)], options({ language }));
    const two = await extractPassages([user(1, alternate)], options({ language }));
    assert.equal(one.candidates.length, 1);
    assert.equal(two.candidates[0].text, quoted);
    assert.equal(one.candidates[0].source.fingerprint, two.candidates[0].source.fingerprint);
    assert.equal(one.candidates[0].count, measure(quoted, language));
    assert.equal((await extractPassages([user(0, quoted), user(1, alternate)], options({ language }))).candidates.length, 1);
  }
});

test('unsupported sentences are boundaries and do not glue short fragments or change hotkey meanings', () => {
  assert.deepEqual(splitPassages(en + ' Press ⌘ to continue. ' + en, 'en').map(part => part.text), [en, en]);
  const short = 'We will take a short walk beside the river before lunch.';
  assert.deepEqual(splitPassages(short + ' Press ⌘ to continue. ' + short, 'en'), []);
  assert.deepEqual(splitPassages('"' + en, 'en'), []);
  assert.deepEqual(splitPassages('As mentioned above, ' + en, 'en'), []);
  assert.deepEqual(splitPassages(zh + '密码：\u200bPRIVATE', 'zh'), []);
});

test('similar messages are deduplicated while distinct paragraphs survive', async () => {
  const other = entries.find(entry => entry.id === 'zh-food-01').text;
  const result = await extractPassages([user(0, zh), user(1, zh.replace('周末', '明天')), user(2, other)], options());
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map(item => item.source.seq), [2, 1]);
});

test('recent hashes search past a repeated chat, and an exhausted pool reuses the oldest eligible passage', async () => {
  const other = entries.find(entry => entry.id === 'zh-food-01').text;
  const fingerprint = async text => (await extractPassages([user(0, text)], options())).candidates[0].source.fingerprint;
  const old = await fingerprint(zh), fresh = await fingerprint(other);
  let reads = 0;
  const make = () => host({ async observeSession(id) { reads++; return { header: { id }, events: [user(0, id === 'first' ? zh : other)] }; } },
    ['first', 'second'].map(id => ({ header: { id } })));
  const app = make();
  assert.equal((await (await app.request('language=zh&recent=' + old)).json()).candidate.source.fingerprint, fresh);
  assert.equal(reads, 2);
  assert.equal((await (await make().request(`language=zh&recent=${fresh}&recent=${old}`)).json()).candidate.source.fingerprint, fresh);
  assert.equal((await (await make().request(`language=zh&recent=${fresh}&recent=${old}&exclude=${fresh}`)).json()).candidate.source.fingerprint, old);
});

test('recent and excluded fingerprints are bounded and validated before reading chats', async () => {
  const app = host();
  for (const query of ['language=zh&recent=private', 'language=zh&exclude=not-a-hash', 'language=zh' + ('&recent=' + 'a'.repeat(64)).repeat(17)]) {
    assert.equal((await app.request(query)).status, 400);
  }
  assert.equal(app.reads.length, 0);
});

test('local extraction honors all three length tiers without splitting a sentence or joining messages', async () => {
  for (const language of ['en', 'zh', 'yue']) for (const length of ['short', 'medium', 'long']) {
    const entry = entries.find(entry => entry.language === language && entry.length === length);
    const result = await extractPassages([user(0, entry.text)], options({ language, length }));
    assert.equal(result.candidates.length, 1, entry.id);
    assert.equal(result.candidates[0].text, entry.text);
    assert.equal(result.candidates[0].length, length);
  }
  assert.equal((await extractPassages([user(0, zh), user(1, zh)], options({ length: 'long' }))).candidates.length, 0);
  await assert.rejects(extractPassages([], options({ length: 'unknown' })), /invalid_options/);
});

test('local route validates and passes the chosen length to extraction', async () => {
  const entry = entries.find(entry => entry.id === 'zh-work-02-long');
  const app = host({ async observeSession(id) { return { header: { id }, events: [user(0, entry.text)] }; } });
  assert.equal((await app.request('language=zh&length=huge')).status, 400);
  const body = await (await app.request('language=zh&length=long')).json();
  assert.equal(body.candidate.text, entry.text); assert.equal(body.candidate.length, 'long');
});


test('timed local batches contain complete distinct excerpts with hashes and satisfy the buffer in every language', async () => {
  for (const language of ['en', 'zh', 'yue']) {
    const texts = entries.filter(entry => entry.language === language && entry.length === 'short').map(entry => entry.text);
    let reads = 0;
    const app = host({ async observeSession(id) { reads++; return { header: { id }, events: texts.map((text, i) => user(i, text)) }; } });
    const body = await (await app.request(`language=${language}&mode=timed`)).json();
    assert.ok(body.candidate.text.length >= 1200); assert.ok(body.candidate.text.length < 1800);
    assert.equal(body.candidate.mode, 'timed'); assert.equal(body.candidate.length, null);
    assert.equal(body.candidate.source.fingerprint.length, 64);
    assert.equal(new Set(body.candidate.source.fingerprints).size, body.candidate.source.fingerprints.length);
    assert.ok(body.candidate.source.fingerprints.length <= 16);
    assert.equal(body.candidate.source.sessionId, undefined);
    assert.equal(body.candidate.source.title, undefined);
    assert.equal(reads, 1);
  }
});

test('timed local search spans chats, excludes the current batch and reuses recent passages only after fresh ones', async () => {
  const texts = entries.filter(entry => entry.language === 'en' && entry.length === 'short').slice(0, 12).map(entry => entry.text);
  let reads = 0;
  const app = host({ async observeSession(id) { reads++; return { header: { id }, events: [user(0, texts[Number(id)])] }; } }, texts.map((_, i) => ({ header: { id: String(i) } })));
  const first = (await (await app.request('language=en&mode=timed')).json()).candidate;
  assert.ok(reads >= 4);
  const query = 'language=en&mode=timed' + first.source.fingerprints.map(hash => '&exclude=' + hash).join('');
  const second = (await (await app.request(query)).json()).candidate;
  assert.ok(second); assert.ok(second.source.fingerprints.every(hash => !first.source.fingerprints.includes(hash)));
  const recent = first.source.fingerprints.map(hash => '&recent=' + hash).join('');
  assert.ok((await (await app.request('language=en&mode=timed' + recent)).json()).candidate);
});

test('timed local requests fall back on insufficient text, reject invalid modes and keep bounded scan limits', async () => {
  assert.equal((await (await host().request('language=zh&mode=timed')).json()).reason, 'insufficient');
  const app = host();
  for (const query of ['language=en&mode=unknown', 'language=en&mode=timed&length=long', 'language=en&exclude=bad',
    'language=en' + ('&exclude=' + 'a'.repeat(64)).repeat(17)]) assert.equal((await app.request(query)).status, 400);
  assert.equal(app.reads.length, 0);
  let reads = 0;
  const scan = host({ async observeSession(id) { reads++; return { header: { id }, events: [user(0)] }; } }, Array.from({ length: 35 }, (_, i) => ({ header: { id: String(i) } })));
  assert.equal((await (await scan.request('language=zh&mode=timed')).json()).candidate, null);
  assert.equal(reads, 30);
});
