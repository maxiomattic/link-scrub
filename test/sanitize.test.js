'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeUrl: u, sanitizeText: t } = require('../sanitize.js');

const cases = [
  // X
  ['https://x.com/jack/status/20?s=20&a=AbC123xyz', 'https://x.com/jack/status/20'],
  ['https://x.com/jack/status/20?a=Zz&s=46&t=QwE', 'https://x.com/jack/status/20'],
  ['https://twitter.com/jack/status/20?s=21', 'https://twitter.com/jack/status/20'],
  ['https://mobile.twitter.com/jack/status/20/photo/1?a=1', 'https://mobile.twitter.com/jack/status/20/photo/1'],
  ['https://x.com/i/web/status/20?a=1', 'https://x.com/i/web/status/20'],
  ['https://x.com/jack/status/20#m', 'https://x.com/jack/status/20#m'],
  ['https://x.com/jack?s=09&a=x', 'https://x.com/jack'],
  ['https://x.com/search?q=cats&src=typed_query&a=1', 'https://x.com/search?q=cats&src=typed_query'],
  ['https://x.com/jack/status/20', 'https://x.com/jack/status/20'],
  // YouTube
  ['https://youtu.be/dQw4w9WgXcQ?si=abcDEF', 'https://youtu.be/dQw4w9WgXcQ'],
  ['https://youtu.be/dQw4w9WgXcQ?si=abc&t=42', 'https://youtu.be/dQw4w9WgXcQ?t=42'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=ygUF&si=x', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['https://www.youtube.com/watch?v=abc&list=PL1&index=3&feature=shared', 'https://www.youtube.com/watch?v=abc&list=PL1&index=3'],
  ['https://youtube.com/shorts/abc123?si=zzz', 'https://youtube.com/shorts/abc123'],
  ['https://m.youtube.com/watch?v=abc&feature=youtu.be', 'https://m.youtube.com/watch?v=abc'],
  ['https://music.youtube.com/watch?v=abc&si=q', 'https://music.youtube.com/watch?v=abc'],
  ['https://www.youtube.com/live/abc?si=q&t=5', 'https://www.youtube.com/live/abc?t=5'],
  ['https://www.youtube.com/results?search_query=a+b%26c&sp=EgI', 'https://www.youtube.com/results?search_query=a+b%26c&sp=EgI'],
  ['https://www.youtube.com/@chan?si=x', 'https://www.youtube.com/@chan'],
  // Untouched
  ['https://example.com/?a=1&si=2', 'https://example.com/?a=1&si=2'],
  ['https://notx.com/status/1?a=1', 'https://notx.com/status/1?a=1'],
  ['https://youtube.com.evil.io/watch?v=1&si=2', 'https://youtube.com.evil.io/watch?v=1&si=2'],
  ['not a url', 'not a url'],
];

test('sanitizeUrl', () => {
  for (const [input, want] of cases) assert.equal(u(input), want, input);
});

test('idempotent', () => {
  for (const [input] of cases) assert.equal(u(u(input)), u(input), input);
});

test('sanitizeText finds links in prose and keeps punctuation', () => {
  assert.equal(
    t('look (https://x.com/a/status/1?s=20&a=Q). and https://youtu.be/x?si=y, ok'),
    'look (https://x.com/a/status/1). and https://youtu.be/x, ok');
  assert.equal(t('plain text'), 'plain text');
  assert.equal(t('https://example.com/?a=1'), 'https://example.com/?a=1');
});

test('sanitizeText html mode handles &amp;', () => {
  assert.equal(
    t('<a href="https://www.youtube.com/watch?v=abc&amp;si=x&amp;t=3">v</a>', true),
    '<a href="https://www.youtube.com/watch?v=abc&amp;t=3">v</a>');
  const same = '<a href="https://example.com/?a=1&amp;b=2">e</a>';
  assert.equal(t(same, true), same);
});
