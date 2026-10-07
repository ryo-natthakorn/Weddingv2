import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSbv, lyricAt } from '../src/app/components/wedding/captions.mjs';
const load = async name => parseSbv(await readFile(new URL(`../src/imports/${name}`, import.meta.url), 'utf8'));
const cues = await load('pantika.sbv');
const english = await load('pantika-en.sbv');
assert.ok(cues.length > 30);
assert.equal(lyricAt(cues, 0), undefined);
assert.equal(lyricAt(cues, 11.559).line, 'เชื่อไหม โลกของฉันมันเคยเป็นสีเทา');
assert.equal(lyricAt(cues, 15.464).line, 'จนเกือบจะหมดหวัง');
assert.equal(lyricAt(cues, 23.5), undefined);
assert.equal(lyricAt(cues, 24.5).line, 'จนกระทั่ง');
assert.equal(lyricAt(cues, 200), undefined);
assert.ok(cues.every(cue => cue.end > cue.t && cue.line.trim()));
// The translation must sit on the Thai cue timings, or switching language
// mid-song would jump lines and the song notes (keyed on cue start) would drift.
assert.deepEqual(english.map(({ t, end }) => [t, end]), cues.map(({ t, end }) => [t, end]));
assert.equal(lyricAt(english, 11.559).line, 'Would you believe my world was once all grey');
assert.equal(lyricAt(english, 24.5).line, 'Until');
assert.equal(lyricAt(english, 23.5), undefined);
assert.ok(english.every(cue => cue.line.trim() && !/[\u0E00-\u0E7F]/.test(cue.line)));
console.log(`PASS ${cues.length} SBV cues: boundaries, gaps, whitespace and end of song`);
console.log(`PASS ${english.length} English SBV cues share the Thai timings`);
