import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoundResult } from './game/types'

const auth = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: { user: User } | null) => void),
  pull: vi.fn(),
  push: vi.fn(),
  signIn: vi.fn(),
  googleCallback: null as null | ((response: { credential?: string }) => void),
  renderGoogleButton: vi.fn(),
  initializeGoogle: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./data/supabase', () => ({
  cloudSyncConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange: (listener: typeof auth.listener) => {
        auth.listener = listener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      signInWithIdToken: auth.signIn,
      signOut: auth.signOut,
    },
  },
}))

vi.mock('./data/googleIdentity', () => ({
  loadGoogleIdentity: vi.fn().mockImplementation(async () => ({
    initialize: auth.initializeGoogle.mockImplementation(({ callback }: { callback: (response: { credential?: string }) => void }) => {
      auth.googleCallback = callback
    }),
    renderButton: auth.renderGoogleButton.mockImplementation((element: HTMLElement, options: { type: string }) => {
      const button = document.createElement('button')
      button.textContent = options.type === 'icon' ? 'Sign in' : 'Sign in with Google'
      button.addEventListener('click', () => auth.googleCallback?.({ credential: 'google-id-token' }))
      element.append(button)
    }),
  })),
  createGoogleNonce: vi.fn().mockResolvedValue({ raw: 'raw-nonce', hashed: 'hashed-nonce' }),
}))

vi.mock('./data/sync', async () => ({
  ...await vi.importActual('./data/sync'),
  pullCloudRounds: auth.pull,
  pushCompletedRounds: auth.push,
}))

import App from './App'

function player(id: string, name: string): User {
  return { id, user_metadata: { full_name: name }, app_metadata: {}, aud: 'authenticated', created_at: '2026-09-23T00:00:00.000Z' } as User
}

function round(id: string, percentage: number): RoundResult {
  return {
    id, completedAt: '2026-09-23T00:00:00.000Z', difficulty: 'easy',
    totalQuestions: 25, correctAnswers: percentage / 4, percentage,
    activeTimeMs: 30_000, averageTimeMs: 1_200, attempts: [],
  }
}

describe('private player sessions', () => {
  beforeEach(() => {
    auth.listener = null
    auth.pull.mockReset().mockImplementation(async (id: string) => id === 'student-a' ? [round('a', 100)] : [round('b', 80)])
    auth.push.mockReset().mockResolvedValue(undefined)
    auth.signIn.mockReset().mockResolvedValue({ error: null })
    auth.googleCallback = null
    auth.initializeGoogle.mockClear()
    auth.renderGoogleButton.mockClear()
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
    auth.signOut.mockReset().mockResolvedValue({ error: null })
  })

  it('opens as a guest and dismisses the score-saving reminder without reading cloud scores', async () => {
    const user = userEvent.setup()
    render(<App />)
    act(() => auth.listener?.('INITIAL_SESSION', null))
    expect(screen.getByRole('heading', { name: 'Multiplication Arena' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in with Google before playing')
    await user.click(screen.getByRole('button', { name: 'Dismiss score-saving reminder' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Guest scores last this visit')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /easy/i }))
    expect(screen.getByLabelText('Your answer')).toBeInTheDocument()
    expect(auth.pull).not.toHaveBeenCalled()
    expect(auth.push).not.toHaveBeenCalled()
  })

  it("uses Google's on-site button and exchanges the ID token with Supabase", async () => {
    const user = userEvent.setup()
    render(<App />)
    act(() => auth.listener?.('INITIAL_SESSION', null))
    await user.click(await screen.findByRole('button', { name: 'Sign in with Google' }))
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
      nonce: 'raw-nonce',
    }))
    expect(auth.initializeGoogle).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'test-client.apps.googleusercontent.com',
      nonce: 'hashed-nonce',
      ux_mode: 'popup',
    }))
  })

  it('replaces scores and name when the signed-in account changes', async () => {
    render(<App />)
    act(() => auth.listener?.('INITIAL_SESSION', { user: player('student-a', 'Alex') }))
    await waitFor(() => expect(screen.getByText('100% · 30.0s')).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Hi, Alex')).toBeInTheDocument()
    act(() => auth.listener?.('SIGNED_IN', { user: player('student-b', 'Blair') }))
    await waitFor(() => expect(screen.getByText('80% · 30.0s')).toBeInTheDocument())
    expect(screen.queryByText('100% · 30.0s')).not.toBeInTheDocument()
    expect(screen.getByText('Hi, Blair')).toBeInTheDocument()
    expect(auth.pull).toHaveBeenCalledWith('student-a')
    expect(auth.pull).toHaveBeenCalledWith('student-b')
    act(() => auth.listener?.('SIGNED_OUT', null))
    expect(screen.queryByText('80% · 30.0s')).not.toBeInTheDocument()
    expect(screen.getByText('Guest scores last this visit')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Guest scores last only this visit')
  })

  it('ignores a previous account’s cloud reply after switching users', async () => {
    let resolveFirst!: (rounds: RoundResult[]) => void
    auth.pull.mockImplementation((id: string) => id === 'student-a'
      ? new Promise<RoundResult[]>((resolve) => { resolveFirst = resolve })
      : Promise.resolve([round('b', 80)]))
    render(<App />)
    act(() => auth.listener?.('INITIAL_SESSION', { user: player('student-a', 'Alex') }))
    await waitFor(() => expect(auth.pull).toHaveBeenCalledWith('student-a'))
    act(() => auth.listener?.('SIGNED_IN', { user: player('student-b', 'Blair') }))
    await waitFor(() => expect(screen.getByText('80% · 30.0s')).toBeInTheDocument())
    await act(async () => resolveFirst([round('a', 100)]))
    expect(screen.queryByText('100% · 30.0s')).not.toBeInTheDocument()
  })
})
