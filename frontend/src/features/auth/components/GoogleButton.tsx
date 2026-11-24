import { useEffect, useId, useRef, useState } from 'react'
import { useTheme } from '../../../components/themeStore'

import { credentialHandlers, loadGoogleClient } from '../services/googleIdentity'

interface GoogleButtonProps {
  disabled?: boolean
  onCredential(credential: string): void
}

export default function GoogleButton({ disabled = false, onCredential }: GoogleButtonProps) {
  const button = useRef<HTMLDivElement>(null)
  const buttonId = useId()
  const { tone } = useTheme()
  const dark = tone > 50
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (disabled) return
    credentialHandlers.set(buttonId, onCredential)
    return () => { credentialHandlers.delete(buttonId) }
  }, [buttonId, disabled, onCredential])

  useEffect(() => {
    const container = button.current
    if (!container) return

    let active = true
    let observer: ResizeObserver | undefined
    loadGoogleClient().then((client) => {
      if (!active) return
      setLoadFailed(false)
      let previousWidth = 0
      const render = () => {
        const width = Math.min(container.clientWidth, 400)
        if (width === 0 || width === previousWidth) return
        previousWidth = width
        container.replaceChildren()
        client.renderButton(container, {
          text: 'continue_with',
          theme: dark ? 'outline_dark' : 'outline',
          width,
          state: buttonId,
        })
      }
      render()
      observer = new ResizeObserver(render)
      observer.observe(container)
    }).catch(() => {
      if (active) setLoadFailed(true)
    })

    return () => {
      active = false
      observer?.disconnect()
      container.replaceChildren()
    }
  }, [buttonId, dark])

  return (
    <>
      <div
        ref={button}
        inert={disabled}
        className={`grid w-full justify-items-center ${disabled ? 'opacity-60' : ''} ${loadFailed ? '' : 'min-h-10'}`}
      />
      {loadFailed && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Google sign-in couldn’t load. Refresh the page to try again.
        </p>
      )}
    </>
  )
}
