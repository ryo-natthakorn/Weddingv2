/** Parse YouTube SBV cues, preserving the supplied text and end times. */
export function parseSbv(source) {
  const cues = [];
  let cue;
  const seconds = value => value.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const timing = line.trim().match(/^(\d+:\d{2}:\d{2}\.\d+),(\d+:\d{2}:\d{2}\.\d+)$/);
    if (timing) {
      cue = { t: seconds(timing[1]), end: seconds(timing[2]), line: '' };
      if (cue.end <= cue.t) throw new Error('Invalid SBV cue duration');
      cues.push(cue);
    } else if (line.trim() && cue) {
      cue.line += (cue.line ? '\n' : '') + line.trim();
    }
  }
  return cues.filter(cue => cue.line).sort((a, b) => a.t - b.t);
}

export function lyricAt(cues, time) {
  return cues.find(cue => time >= cue.t && time < cue.end);
}
