import { useEffect, useRef, useState, type FormEvent } from 'react'
import DateField from '../../../components/DateField'
import CustomSelect from '../../../components/ui/CustomSelect'
import { useListCategoriesQuery } from '../../categories/services/categoryApi'
import {
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  type Transaction,
  type TransactionCurrency,
  type TransactionType,
} from '../services/transactionApi'

const currencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const satisfies readonly TransactionCurrency[]

type Props =
  | { transaction?: undefined; onCreated: () => void }
  | { transaction: Transaction; onUpdated: () => void; onCancel: () => void }

export default function TransactionForm(props: Props) {
  const { transaction } = props
  const originalDate = transaction?.date.slice(0, 10) ?? ''
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [currency, setCurrency] = useState<TransactionCurrency | ''>(transaction?.currency ?? '')
  const [date, setDate] = useState(originalDate)
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { data, isLoading, isError } = useListCategoriesQuery()
  const [createTransaction, { isLoading: creating }] = useCreateTransactionMutation()
  const [updateTransaction, { isLoading: updating }] = useUpdateTransactionMutation()
  const saving = creating || updating
  const categories = (data?.categories ?? []).filter((item) => item.type === type || item.type === 'both')
  const keepsOriginalCategory = transaction && type === transaction.type && category === transaction.category
  const categoryIsListed = categories.some((item) => item._id === category)
  const selectedCategory = categoryIsListed || keepsOriginalCategory ? category : ''
  const originalCategoryName = data?.categories.find((item) => item._id === transaction?.category)?.name

  useEffect(() => {
    if (transaction) headingRef.current?.focus()
  }, [transaction])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !selectedCategory) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const amount = Number(fields.get('amount'))
    const description = String(fields.get('description') ?? '').trim()
    setError('')
    try {
      if (props.transaction) {
        await updateTransaction({
          id: props.transaction._id,
          data: {
            type,
            amount,
            category: keepsOriginalCategory ? undefined : selectedCategory,
            currency: currency && currency !== props.transaction.currency ? currency : undefined,
            description,
            date: date === originalDate ? undefined : date,
          },
        }).unwrap()
        props.onUpdated()
        return
      }

      await createTransaction({
        type,
        amount,
        category: selectedCategory,
        currency: currency || undefined,
        description,
        date: date || undefined,
      }).unwrap()
      form.reset()
      setCategory('')
      setCurrency('')
      setDate('')
      props.onCreated()
    } catch {
      setError('Could not save the transaction. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 p-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        {transaction ? 'Edit transaction' : 'New transaction'}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-stack">
          Type
          <CustomSelect value={type} disabled={saving} onChange={(event) => {
            setType(event.target.value === 'income' ? 'income' : 'expense')
            setCategory('')
          }}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </CustomSelect>
        </label>
        <label className="field-stack">
          Amount
          <input name="amount" type="number" min="0.01" max="1000000000" step="0.01"
            defaultValue={transaction?.amount} required disabled={saving}
            className="form-control control-height px-3" />
        </label>
        <label className="field-stack">
          Currency
          <CustomSelect
            aria-label="Currency"
            value={currency}
            disabled={saving}
            onChange={(event) => setCurrency(event.target.value as TransactionCurrency | '')}
          >
            {!transaction && <option value="">Use default currency</option>}
            {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
          </CustomSelect>
        </label>
        <label className="field-stack">
          Category
          <CustomSelect value={selectedCategory} required disabled={saving || isLoading || isError}
            onChange={(event) => setCategory(event.target.value)}>
            <option value="">{isLoading ? 'Loading categories…' : 'Choose a category'}</option>
            {keepsOriginalCategory && !categoryIsListed && (
              <option value={category}>{originalCategoryName ?? 'Current category'}</option>
            )}
            {categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </CustomSelect>
        </label>
        <div className="field-stack">
          <label htmlFor="transaction-date">{transaction ? 'Date' : 'Date (optional)'}</label>
          <DateField
            id="transaction-date"
            value={date}
            required={Boolean(transaction)}
            disabled={saving}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <label className="field-stack">
          Description (optional)
          <input name="description" defaultValue={transaction?.description} maxLength={500} disabled={saving}
            className="form-control control-height px-3" />
        </label>
      </div>
      {isError && <p role="alert" className="form-error">Could not load categories.</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="button-primary" disabled={saving || !selectedCategory}>
          {saving ? 'Saving…' : props.transaction ? 'Save changes' : 'Save transaction'}
        </button>
        {props.transaction && (
          <button type="button" className="button-secondary" onClick={props.onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
