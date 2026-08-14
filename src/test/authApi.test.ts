import { describe, expect, it } from 'vitest'
import { parseLoginError } from '../auth/authApi'

describe('login errors', () => {
  it('preserves backend credential messages', () => {
    expect(parseLoginError({ response: { status: 401, data: { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } } } })).toBe('Email or password is incorrect.')
  })

  it('explains rate limiting without retrying', () => {
    expect(parseLoginError({ response: { status: 429, data: { success: false, error: { code: 'RATE_LIMITED', message: 'Try again later.' } } } })).toContain('Try again later.')
  })
})
