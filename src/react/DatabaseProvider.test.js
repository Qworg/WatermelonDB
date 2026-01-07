import React from 'react'
import { render, screen } from '@testing-library/react'
import Database from '../Database'
import { mockDatabase } from '../__tests__/testModels'
import DatabaseProvider from './DatabaseProvider'
import { DatabaseConsumer } from './DatabaseContext'
import withDatabase from './withDatabase'

// Simple mock component
function MockComponent({ database }) {
  return (
    <span data-testid="mock-component">{database instanceof Database ? 'valid' : 'invalid'}</span>
  )
}

describe('DatabaseProvider', () => {
  let database
  beforeAll(() => {
    database = mockDatabase().db
  })
  it('throws if no database or adapter supplied', () => {
    // Suppress console.error for expected errors
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(
        <DatabaseProvider>
          <p />
        </DatabaseProvider>,
      )
    }).toThrow(/You must supply a valid database/i)

    expect(() => {
      render(
        <DatabaseProvider database={{ fake: 'db' }}>
          <p />
        </DatabaseProvider>,
      )
    }).toThrow(/You must supply a valid database/i)

    consoleSpy.mockRestore()
  })
  it('passes database to consumer', () => {
    let receivedDatabase = null
    render(
      <DatabaseProvider database={database}>
        <DatabaseConsumer>
          {(db) => {
            receivedDatabase = db
            return <MockComponent database={db} />
          }}
        </DatabaseConsumer>
      </DatabaseProvider>,
    )

    expect(receivedDatabase).toBeInstanceOf(Database)
    expect(screen.getByTestId('mock-component').textContent).toBe('valid')
  })

  describe('withDatabase', () => {
    test('should pass the database from the context to the consumer', () => {
      let receivedDatabase = null
      const Child = withDatabase(({ database: db }) => {
        receivedDatabase = db
        return <MockComponent database={db} />
      })

      render(
        <DatabaseProvider database={database}>
          <Child />
        </DatabaseProvider>,
      )

      expect(receivedDatabase).toBeInstanceOf(Database)
      expect(screen.getByTestId('mock-component').textContent).toBe('valid')
    })
  })
})
