interface GoogleIdentity {
  initialize(options: {
    client_id: string
    ux_mode: 'popup'
    callback(response: { credential: string; state?: string }): void
  }): void
  renderButton(parent: HTMLElement, options: {
    text: 'continue_with'
    theme: 'outline' | 'outline_dark'
    width: number
    state: string
  }): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } }
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
export const googleSignInEnabled = Boolean(clientId)

export const credentialHandlers = new Map<string, (credential: string) => void>()
let googleClient: Promise<GoogleIdentity> | undefined

export function loadGoogleClient(): Promise<GoogleIdentity> {
  if (!clientId) return Promise.reject(new Error('Google sign-in is not configured'))
  if (!googleClient) {
    googleClient = new Promise<GoogleIdentity>((resolve, reject) => {
      const existingClient = window.google?.accounts.id
      if (existingClient) {
        resolve(existingClient)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => {
        const client = window.google?.accounts.id
        if (client) resolve(client)
        else {
          script.remove()
          reject(new Error('Google Identity Services is unavailable'))
        }
      }
      script.onerror = () => {
        script.remove()
        reject(new Error('Google Identity Services failed to load'))
      }
      document.head.append(script)
    }).then((client) => {
      client.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: ({ credential, state }) => {
          // Google echoes the clicked button's state. Ignore callbacks for
          // buttons that were removed while the account picker was open.
          if (state && credential) credentialHandlers.get(state)?.(credential)
        },
      })
      return client
    }).catch((error: unknown) => {
      googleClient = undefined
      throw error
    })
  }
  return googleClient
}
