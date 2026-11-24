// Node runs the tests and compares the actual preview with the expected result.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvService } from '../dist/services/csv.service.js';

test('preview suggests columns using the original bank headers', () => {
  // Quotes keep the comma in the lunch description inside one CSV cell.
  const csv = [
    'Posted Date,Amount INR,Narration',
    '2026-11-24,80,"Lunch, downtown"',
  ].join('\n');

  // File uploads reach the service as bytes. Buffer.from gives it the same input here.
  const preview = csvService.preview(Buffer.from(csv));

  // The mapping connects SpendWise fields to the exact headers shown to the user.
  assert.deepEqual(preview.suggestedColumns, {
    dateColumn: 'Posted Date',
    amountColumn: 'Amount INR',
    descriptionColumn: 'Narration',
  });

  // The header occupies line 1. Preview keeps cell values as text, including the amount.
  assert.deepEqual(preview.rows, [
    {
      line: 2,
      values: {
        'Posted Date': '2026-11-24',
        'Amount INR': '80',
        Narration: 'Lunch, downtown',
      },
    },
  ]);
});

test('preview shows the first ten rows and counts the entire file', () => {
  // Twelve distinct payments let us check which ten appear and in what order.
  const rows = Array.from({ length: 12 }, (_, i) => `Payment ${i + 1}`);
  const csv = ['Description', ...rows].join('\n');
  const preview = csvService.preview(Buffer.from(csv));

  // The total includes the two payments beyond the preview limit.
  assert.equal(preview.totalRows, 12);

  // Array indexes start at 0, while the first payment is on CSV line 2.
  const expectedRows = rows.slice(0, 10).map((description, i) => ({
    line: i + 2,
    values: { Description: description },
  }));
  assert.deepEqual(preview.rows, expectedRows);
});
