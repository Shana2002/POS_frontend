import { describe, expect, it } from 'vitest'
import { getSettingInputType } from '../features/admin/adminUtils'

describe('settings editor', () => {
  it.each([
    ['boolean', 'checkbox'], ['number', 'number'], ['date', 'date'], ['string', 'text'],
  ])('maps %s to an accessible input', (dataType, inputType) => {
    expect(getSettingInputType(dataType)).toBe(inputType)
  })
})
