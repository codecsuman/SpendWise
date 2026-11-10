// ============================================================================
// GlobalQuickActions.tsx — floating Quick Note and Calculator on every
// authenticated page.
//
// It lives in the layout, so the user can capture a note without navigating to
// /workspace first. Saving a quick note opens that note in the Workspace.
// ============================================================================

import { Calculator, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CalculatorPanel from '../../features/workspace/components/CalculatorPanel'
import QuickNoteDialog from '../../features/workspace/components/QuickNoteDialog'

export default function GlobalQuickActions() {
  const [quickOpen, setQuickOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCalcOpen(true)}
          aria-label="Open calculator"
          title="Calculator"
          className="btn-icon shadow-lg"
        >
          <Calculator className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          aria-label="Write a quick note"
          title="Quick note"
          className="btn-icon shadow-lg"
        >
          <StickyNote className="size-5" />
        </button>
      </div>

      <QuickNoteDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(note) => {
          setQuickOpen(false)
          navigate(`/workspace/${note._id}`)
        }}
      />

      <CalculatorPanel open={calcOpen} onClose={() => setCalcOpen(false)} />
    </>
  )
}
