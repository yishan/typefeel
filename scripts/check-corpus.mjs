import { pathToFileURL } from 'node:url';
import corpus from '../data/passages.json' with { type: 'json' };
import { LANGUAGES, measure, normalizeText, qualityIssues, nearDuplicate } from '../packages/practice/src/text-policy.js';
import { TEXT_LENGTHS, PASSAGE_LENGTHS } from '../packages/practice/src/passage-lengths.js';

export function validateCorpus(data = corpus) {
  const errors = [];
  const ids = new Set();
  if (data.version !== 2 || data.license !== 'MIT' || data.provenance?.kind !== 'original') errors.push('Invalid corpus provenance or version');
  for (const entry of data.entries) {
    const { id, language, topic, text, length, family } = entry;
    if (!/^(en|zh|yue)-[a-z]+-\d{2}(?:-medium|-long)?$/.test(id) || ids.has(id)
      || family !== `${language}-${topic}-${id.split('-')[2]}` || id !== family + (length === 'short' ? '' : '-' + length)) errors.push(`${id}: invalid metadata`);
    ids.add(id);
    if (!LANGUAGES.includes(language) || !TEXT_LENGTHS.includes(length) || typeof text !== 'string') { errors.push(`${id}: invalid text`); continue; }
    if (text !== normalizeText(text, language)) errors.push(`${id}: noncanonical typography`);
    const count = measure(text, language), [min, max] = PASSAGE_LENGTHS[length][language];
    if (count < min || count > max) errors.push(`${id}: length ${count}, expected ${min}-${max}`);
    errors.push(...qualityIssues(text, language).map(issue => `${id}: ${issue}`));
  }
  for (const language of LANGUAGES) {
    const rows = data.entries.filter(entry => entry.language === language);
    for (const length of TEXT_LENGTHS) {
      const tier = rows.filter(entry => entry.length === length);
      if (tier.length < 32 || new Set(tier.map(entry => entry.topic)).size < 8) errors.push(`${language}/${length}: insufficient variety`);
    }
    for (const family of new Set(rows.map(entry => entry.family))) {
      const variants = rows.filter(entry => entry.family === family);
      if (variants.length !== 3 || new Set(variants.map(entry => entry.length)).size !== 3) errors.push(`${family}: incomplete family`);
      const short = variants.find(entry => entry.length === 'short'), medium = variants.find(entry => entry.length === 'medium'), long = variants.find(entry => entry.length === 'long');
      if (short && medium && long && (!medium.text.startsWith(short.text) || !long.text.startsWith(medium.text))) errors.push(`${family}: inconsistent progression`);
    }
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      if (rows[i].family !== rows[j].family && nearDuplicate(rows[i].text, rows[j].text)) errors.push(`${rows[i].id} and ${rows[j].id}: duplicate`);
    }
  }
  if (errors.length) throw new Error('Corpus validation failed:\n' + errors.join('\n'));
  return Object.fromEntries(LANGUAGES.map(language => [language, data.entries.filter(entry => entry.language === language).length]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(validateCorpus());
