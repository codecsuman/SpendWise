import { useId, useState, type FormEvent } from 'react';
import { usePreviewCsvMutation } from '../services/csvApi';
import CsvImportForm from './CsvImportForm';

export default function CsvPreview() {
  const headingId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewCsv, { data, isLoading, isError, reset }] =
    usePreviewCsvMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep the page open while RTK Query sends the selected file.
    event.preventDefault();
    if (file) void previewCsv(file);
  }

  const preview = data?.preview;

  return (
    <section className="surface-card space-y-4 p-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold">
        Preview a CSV
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={isLoading}
            className="form-control w-full px-3 py-2"
            onChange={(event) => {
              // Clear the old preview when the selected file changes.
              reset();
              setFile(event.currentTarget.files?.[0] ?? null);
            }}
          />
        </label>

        <button
          type="submit"
          className="button-primary h-9"
          disabled={!file || isLoading}
        >
          {isLoading ? 'Loading preview…' : 'Preview'}
        </button>
      </form>

      {isError && (
        <p role="alert" className="form-error">
          Could not preview the CSV. Check the file and try again.
        </p>
      )}

      {preview && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="data-table">
            <caption className="px-4 py-3 text-left text-muted-foreground">
              Showing {preview.rows.length} of {preview.totalRows} rows
            </caption>
            <thead>
              <tr>
                {preview.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.line}>
                  {/* Follow the header order to align cells with their columns. */}
                  {preview.headers.map((header) => (
                    <td key={header}>
                      {row.values[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Show the mapping form only after the server reads the CSV headers. */}
      {file && preview && (
        <CsvImportForm
          file={file}
          headers={preview.headers}
          suggestedColumns={preview.suggestedColumns}
        />
      )}
    </section>
  );
}
