export interface GoogleIdentity {
  initialize(options: {
    client_id: string
    callback: (response: { credential?: string }) => void
    nonce: string
    ux_mode: 'popup'
  }): void
  renderButton(element: HTMLElement, options: {
    type: 'standard' | 'icon'
    theme: 'outline'
    size: 'medium'
    shape: 'pill' | 'circle'
    text?: 'signin_with'
  }): void
}

const CLIENT_SCRIPT = 'https://accounts.google.com/gsi/client'
let identityPromise: Promise<GoogleIdentity> | null = null

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const existing = (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id
  if (existing) return Promise.resolve(existing)
  if (identityPromise) return identityPromise

  identityPromise = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CLIENT_SCRIPT
    script.async = true
    script.onload = () => {
      const identity = (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id
      if (identity) resolve(identity)
      else reject(new Error('Google Identity Services did not initialize'))
    }
    script.onerror = () => reject(new Error('Google Identity Services could not load'))
    document.head.append(script)
  }).catch((error: unknown) => {
    identityPromise = null
    throw error
  })
  return identityPromise
}

export async function createGoogleNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}
