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
