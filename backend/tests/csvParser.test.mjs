import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv } from '../dist/utils/csvParser.js';

test('parses quoted fields and records source lines', () => {
  const csv = [
    'Date,Amount,Description',
    '2026-11-20,"1,250.00","Groceries, weekly"',
    '2026-11-21,80,Bus ticket',
  ].join('\r\n');

  const { headers, rows } = parseCsv(csv);

  assert.deepEqual(headers, ['Date', 'Amount', 'Description']);
  assert.deepEqual(rows, [
    { line: 2, values: ['2026-11-20', '1,250.00', 'Groceries, weekly'] },
    { line: 3, values: ['2026-11-21', '80', 'Bus ticket'] },
  ]);
});

test('reports the line of an unclosed quote', () => {
  assert.throws(
    () => parseCsv('Date,Description\n2026-11-20,"Groceries'),
    { statusCode: 400, message: /Unclosed quote starting on line 2/ },
  );
});

test('reports the line where the unfinished quoted field opens', () => {
  for (const eol of ['\n', '\r\n', '\r']) {
    const csv = ['Description,Note', '"Weekly', 'shop","Missing end'].join(eol);

    assert.throws(() => parseCsv(csv), {
      statusCode: 400,
      message: 'Unclosed quote starting on line 3',
    });
  }
});

test('preserves escaped quotes and line breaks inside a description', () => {
  const csv = [
    'Amount,Description',
    '80,"Lunch at ""Corner Cafe""',
    'with friends"',
    '25,Bus ticket',
  ].join('\n');

  assert.deepEqual(parseCsv(csv).rows, [
    { line: 2, values: ['80', 'Lunch at "Corner Cafe"\nwith friends'] },
    { line: 4, values: ['25', 'Bus ticket'] },
  ]);
});
