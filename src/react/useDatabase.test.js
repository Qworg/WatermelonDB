import React from 'react'
import { render } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import useDatabase from './useDatabase'
import DatabaseProvider from './DatabaseProvider'
import Database from '../Database'
import { mockDatabase } from '../__tests__/testModels'

describe('useDatabase hook', () => {
  let database
  beforeAll(() => {
    database = mockDatabase().db
  })
  test('should use database', () => {
    const wrapper = ({ children }) => (
      <DatabaseProvider database={database}>{children}</DatabaseProvider>
    )
    const { result } = renderHook(() => useDatabase(), { wrapper })
    expect(result.current).toBeInstanceOf(Database)
  })
  test('should throw without Provider', () => {
    const Component = () => {
      useDatabase()
      return null
    }

    // Suppress console.error for the expected error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<Component />)
    }).toThrow(
      /Could not find database context, please make sure the component is wrapped in the <DatabaseProvider>/i,
    )

    consoleSpy.mockRestore()
  })
})
