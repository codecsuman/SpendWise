// ============================================================================
// GlobalQuickActions.tsx — floating Quick Note and Calculator on every
// authenticated page.
//
// The dialogs load only when opened, so they do not weigh down the first page.
// ============================================================================

import { Calculator, StickyNote } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const CalculatorPanel = lazy(() => import('../../features/workspace/components/CalculatorPanel'))
const QuickNoteDialog = lazy(() => import('../../features/workspace/components/QuickNoteDialog'))

export default function GlobalQuickActions() {
  const [quickOpen, setQuickOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <div className="quick-actions">
        <button
          type="button"
          onClick={() => setCalcOpen(true)}
          aria-label="Open calculator"
          title="Calculator"
          className="btn-icon floating-shadow"
        >
          <Calculator className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          aria-label="Write a quick note"
          title="Quick note"
          className="btn-icon floating-shadow"
        >
          <StickyNote className="size-5" />
        </button>
      </div>

      <Suspense fallback={null}>
        {quickOpen && (
          <QuickNoteDialog
            open
            onClose={() => setQuickOpen(false)}
            onCreated={(note) => {
              setQuickOpen(false)
              navigate(`/workspace/${note._id}`)
            }}
          />
        )}

        {calcOpen && <CalculatorPanel open onClose={() => setCalcOpen(false)} />}
      </Suspense>
    </>
  )
}
