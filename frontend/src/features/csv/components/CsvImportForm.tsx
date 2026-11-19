import type { FormEvent } from 'react';
import { useImportCsvMutation } from '../services/csvApi';

interface CsvImportFormProps {
  file: File;
  headers: string[];
  suggestedColumns: {
    dateColumn?: string;
    amountColumn?: string;
    categoryColumn?: string;
    descriptionColumn?: string;
  };
}

// These names match the fields the backend expects in the multipart request.
const columnFields = [
  { name: 'dateColumn', label: 'Date', required: true },
  { name: 'amountColumn', label: 'Amount', required: true },
  { name: 'categoryColumn', label: 'Category', required: true },
  { name: 'descriptionColumn', label: 'Description', required: false },
] as const;

export default function CsvImportForm({
  file,
  headers,
  suggestedColumns,
}: CsvImportFormProps) {
  const [importCsv, { data, isLoading, isError }] = useImportCsvMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // FormData reads the selected CSV header names from the browser form.
    const fields = new FormData(event.currentTarget);
    const type = fields.get('type') === 'income' ? 'income' : 'expense';

    // Send the original file again so the server can import all its rows.
    void importCsv({
      file,
      options: {
        dateColumn: String(fields.get('dateColumn') ?? ''),
        amountColumn: String(fields.get('amountColumn') ?? ''),
        categoryColumn: String(fields.get('categoryColumn') ?? ''),
        descriptionColumn: String(fields.get('descriptionColumn') ?? ''),
        type,
        skipDuplicates: fields.has('skipDuplicates'),
      },
    });
  }

  const result = data?.result;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <h3 className="font-semibold">Map CSV columns</h3>

      <fieldset disabled={isLoading} className="grid gap-3 sm:grid-cols-2">
        {columnFields.map(({ name, label, required }) => (
          <label key={name} className="flex flex-col gap-1 text-sm">
            {label}
            <select
              name={name}
              required={required}
              defaultValue={suggestedColumns[name] ?? ''}
              className="form-control h-9 px-3"
            >
              <option value="">
                {required ? 'Choose a column' : 'Skip this field'}
              </option>
              {headers.map((header) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </label>
        ))}

        <label className="flex flex-col gap-1 text-sm">
          Transaction type
          <select name="type" className="form-control h-9 px-3">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="skipDuplicates" defaultChecked />
          Skip duplicates
        </label>
      </fieldset>

      <button type="submit" disabled={isLoading} className="button-primary h-9">
        {isLoading ? 'Importing...' : 'Import transactions'}
      </button>

      {isError && (
        <p role="alert" className="form-error">Could not import the CSV.</p>
      )}

      {result && (
        <div role="status" className="space-y-2 text-sm">
          <p>{result.imported} imported, {result.skipped} skipped, {result.failed} failed.</p>
          {result.errors.length > 0 && (
            <ul className="list-disc pl-5">
              {result.errors.map(({ line, message }, index) => (
                <li key={`${line}-${index}`}>Line {line}: {message}</li>
              ))}
            </ul>
          )}
          {result.errorsTruncated && <p>Only the first 50 row errors are shown.</p>}
        </div>
      )}
    </form>
  );
}
