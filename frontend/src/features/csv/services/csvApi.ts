import { API_URL } from '../../../config/api'
import {
  transactionApi,
  type TransactionCurrency,
  type TransactionType,
} from '../../transactions/services/transactionApi';

// Mapping values are CSV header names, such as "Date" or "Amount".
interface CsvColumnMapping {
  dateColumn?: string;
  amountColumn?: string;
  descriptionColumn?: string;
  typeColumn?: string;
  categoryColumn?: string;
}

interface CsvPreviewResponse {
  success: boolean;
  preview: {
    headers: string[];
    totalRows: number;
    rows: Array<{ line: number; values: Record<string, string> }>;
    suggestedColumns: CsvColumnMapping;
  };
}

// Import requires the date and amount columns. The server validates the rest.
export interface CsvImportOptions extends CsvColumnMapping {
  dateColumn: string;
  amountColumn: string;
  defaultCategory?: string;
  type?: TransactionType;
  currency?: TransactionCurrency;
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  skipDuplicates?: boolean;
}

interface CsvImportResponse {
  success: boolean;
  result: {
    imported: number;
    skipped: number;
    failed: number;
    errors: Array<{ line: number; message: string }>;
    errorsTruncated: boolean;
  };
}

function createCsvForm(file: File, options?: CsvImportOptions): FormData {
  const body = new FormData();

  // "file" is the field name the server's upload middleware expects.
  body.append('file', file);

  for (const [name, value] of Object.entries(options ?? {})) {
    // Multipart sends options as text. String(false) becomes "false".
    if (value !== undefined && value !== '') {
      body.append(name, String(value));
    }
  }

  // The browser sets the multipart Content-Type and boundary for this body.
  return body;
}

// Reuse the transaction slice so an import can refresh the transaction list.
export const csvApi = transactionApi.injectEndpoints({
  endpoints: (builder) => ({
    // Preview sends the file by itself and returns headers and sample rows.
    previewCsv: builder.mutation<CsvPreviewResponse, File>({
      query: (file) => ({
        url: `${API_URL}/api/csv/preview`,
        method: 'POST',
        body: createCsvForm(file),
      }),
    }),

    // Import sends the file again with the user's confirmed column mappings.
    importCsv: builder.mutation<
      CsvImportResponse,
      { file: File; options: CsvImportOptions }
    >({
      query: ({ file, options }) => ({
        url: `${API_URL}/api/csv/import`,
        method: 'POST',
        body: createCsvForm(file, options),
      }),
      invalidatesTags: (response) =>
        response && response.result.imported > 0 ? ['Transaction'] : [],
    }),
  }),
});

export const { usePreviewCsvMutation, useImportCsvMutation } = csvApi;
