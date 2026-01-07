import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BehaviorSubject, Subject, throwError } from 'rxjs'
import withObservables from './index'

describe('withObservables', () => {
  it('should hoist non react statics', () => {
    class A extends React.PureComponent {
      static nonReactProp = 'temp_string'

      render() {
        return null
      }
    }
    const getObservables = () => ({})
    const WrappedComponent = withObservables([], getObservables)(A)
    expect(WrappedComponent.nonReactProp).toBe(A.nonReactProp)
  })

  it('renders null while loading', () => {
    const subject = new Subject()
    const Component = ({ value }) => <div data-testid="content">{value}</div>
    const Enhanced = withObservables([], () => ({ value: subject }))(Component)

    const { container } = render(<Enhanced />)

    expect(container.firstChild).toBe(null)
  })

  it('renders component with injected props after data loads', async () => {
    const subject = new BehaviorSubject('test-value')
    const Component = ({ value }) => <div data-testid="content">{value}</div>
    const Enhanced = withObservables([], () => ({ value: subject }))(Component)

    render(<Enhanced />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('test-value')
    })
  })

  it('passes through original props', async () => {
    const subject = new BehaviorSubject('observed')
    const Component = ({ original, value }) => (
      <div data-testid="content">
        {original}-{value}
      </div>
    )
    const Enhanced = withObservables([], () => ({ value: subject }))(Component)

    render(<Enhanced original="passed" />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('passed-observed')
    })
  })

  it('re-subscribes when trigger props change', async () => {
    const createSubject = (id) => new BehaviorSubject(`value-${id}`)
    const Component = ({ value }) => <div data-testid="content">{value}</div>
    const Enhanced = withObservables(['id'], ({ id }) => ({
      value: createSubject(id),
    }))(Component)

    const { rerender } = render(<Enhanced id={1} />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('value-1')
    })

    rerender(<Enhanced id={2} />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('value-2')
    })
  })

  it('throws error for Error Boundary', async () => {
    const error = new Error('Observable error')
    const errorSubject = throwError(() => error)
    const Component = ({ value }) => <div>{value}</div>
    const Enhanced = withObservables([], () => ({ value: errorSubject }))(Component)

    // Create a simple error boundary
    class ErrorBoundary extends React.Component {
      state = { hasError: false, error: null }

      static getDerivedStateFromError(err) {
        return { hasError: true, error: err }
      }

      render() {
        if (this.state.hasError) {
          return <div data-testid="error">{this.state.error.message}</div>
        }
        return this.props.children
      }
    }

    // Suppress console.error for the expected error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Enhanced />
      </ErrorBoundary>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Observable error')
    })

    consoleSpy.mockRestore()
  })

  it('sets displayName for debugging', () => {
    const Component = ({ value }) => <div>{value}</div>
    Component.displayName = 'TestComponent'

    const Enhanced = withObservables(['id'], () => ({}))(Component)

    expect(Enhanced.displayName).toBe('withObservables[id](TestComponent)')
  })

  it('sets displayName with null triggerProps', () => {
    const Component = ({ value }) => <div>{value}</div>
    Component.displayName = 'TestComponent'

    const Enhanced = withObservables(null, () => ({}))(Component)

    expect(Enhanced.displayName).toBe('withObservables[null](TestComponent)')
  })

  it('updates when observable emits new value', async () => {
    const subject = new BehaviorSubject('initial')
    const Component = ({ value }) => <div data-testid="content">{value}</div>
    const Enhanced = withObservables([], () => ({ value: subject }))(Component)

    render(<Enhanced />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('initial')
    })

    subject.next('updated')

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('updated')
    })
  })

  it('handles multiple observables', async () => {
    const subject1 = new BehaviorSubject('first')
    const subject2 = new BehaviorSubject('second')
    const Component = ({ a, b }) => (
      <div data-testid="content">
        {a}-{b}
      </div>
    )
    const Enhanced = withObservables([], () => ({
      a: subject1,
      b: subject2,
    }))(Component)

    render(<Enhanced />)

    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe('first-second')
    })
  })
})
