import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Math Quest app', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', undefined)
  })

  it('starts a round and validates an empty answer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /easy/i }))
    const input = screen.getByLabelText('Your answer')
    expect(input).toHaveFocus()
    await user.click(screen.getByRole('button', { name: /lock it in/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('whole-number')
    expect(screen.getByText('Question').parentElement).toHaveTextContent('1/25')
  })

  it('submits a whole-number answer with Enter and rejects malformed input', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /medium/i }))
    const input = screen.getByLabelText('Your answer')
    await user.type(input, '-1.5{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('whole-number')
    await user.clear(input)
    await user.type(input, '999{Enter}')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('You answered 999')).toBeInTheDocument()
    expect(screen.getByText(/Correct answer:/)).toBeInTheDocument()
  })

  it('toggles the sound preference in the current session', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Mute sound effects' }))
    expect(screen.getByRole('button', { name: 'Enable sound effects' })).toBeInTheDocument()
  })

  it('pauses when the document is hidden and restores focus after resume', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /easy/i }))
    const input = screen.getByLabelText('Your answer')
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const pausedTime = screen.getByText(/^\d+\.\ds$/).textContent
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(screen.getByText(/^\d+\.\ds$/)).toHaveTextContent(pausedTime ?? '')
    await user.click(await screen.findByRole('button', { name: /resume round/i }))
    expect(input).toHaveFocus()
    hidden.mockRestore()
  })
})
