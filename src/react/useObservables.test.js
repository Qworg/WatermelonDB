import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { BehaviorSubject, Subject, throwError, of } from 'rxjs'
import useObservables from './useObservables'

describe('useObservables', () => {
  it('starts in loading state', () => {
    const subject = new Subject()
    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        value: subject,
      })),
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('returns data when all observables emit', async () => {
    const subject1 = new BehaviorSubject('value1')
    const subject2 = new BehaviorSubject('value2')

    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        first: subject1,
        second: subject2,
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      first: 'value1',
      second: 'value2',
    })
    expect(result.current.error).toBe(null)
  })

  it('handles synchronous emissions', async () => {
    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        sync: of('immediate'),
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ sync: 'immediate' })
  })

  it('re-subscribes when trigger props change', async () => {
    const createObservable = (id) => new BehaviorSubject(`data-${id}`)

    const { result, rerender } = renderHook(
      ({ id }) =>
        useObservables({ id }, ['id'], (props) => ({
          item: createObservable(props.id),
        })),
      { initialProps: { id: 1 } },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ item: 'data-1' })

    // Change trigger prop
    rerender({ id: 2 })

    // Should go back to loading
    await waitFor(() => {
      expect(result.current.data).toEqual({ item: 'data-2' })
    })
  })

  it('does not re-subscribe when non-trigger props change', async () => {
    let subscribeCount = 0
    const createObservable = () => {
      subscribeCount++
      return new BehaviorSubject('data')
    }

    const { result, rerender } = renderHook(
      ({ id, other }) =>
        useObservables({ id, other }, ['id'], () => ({
          item: createObservable(),
        })),
      { initialProps: { id: 1, other: 'a' } },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialSubscribeCount = subscribeCount

    // Change non-trigger prop
    rerender({ id: 1, other: 'b' })
    rerender({ id: 1, other: 'c' })

    // Should not have re-subscribed
    expect(subscribeCount).toBe(initialSubscribeCount)
  })

  it('handles errors and sets error state', async () => {
    const error = new Error('Test error')
    const errorObservable = throwError(() => error)

    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        failing: errorObservable,
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe(error)
    expect(result.current.data).toBe(null)
  })

  it('cleans up subscriptions on unmount', async () => {
    let unsubscribed = false
    const observable = {
      subscribe: (onNext, onError, onComplete) => {
        onNext('value')
        return {
          unsubscribe: () => {
            unsubscribed = true
          },
        }
      },
    }

    const { unmount, result } = renderHook(() =>
      useObservables({}, null, () => ({
        item: observable,
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    unmount()

    expect(unsubscribed).toBe(true)
  })

  it('handles empty observables object', async () => {
    const { result } = renderHook(() => useObservables({}, null, () => ({})))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({})
    expect(result.current.error).toBe(null)
  })

  it('works with objects that have observe() method', async () => {
    const observableConvertible = {
      observe: () => new BehaviorSubject('observed'),
    }

    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        item: observableConvertible,
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ item: 'observed' })
  })

  it('waits for all observables before resolving', async () => {
    const subject1 = new BehaviorSubject('first')
    const subject2 = new Subject() // Does not emit initially

    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        first: subject1,
        second: subject2,
      })),
    )

    // Should still be loading because subject2 hasn't emitted
    expect(result.current.isLoading).toBe(true)

    // Emit from subject2
    act(() => {
      subject2.next('second')
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({
      first: 'first',
      second: 'second',
    })
  })

  it('updates when observables emit new values', async () => {
    const subject = new BehaviorSubject('initial')

    const { result } = renderHook(() =>
      useObservables({}, null, () => ({
        value: subject,
      })),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual({ value: 'initial' })

    act(() => {
      subject.next('updated')
    })

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 'updated' })
    })
  })

  it('works with null triggerProps (subscribe once)', async () => {
    let subscribeCount = 0
    const createObservable = () => {
      subscribeCount++
      return new BehaviorSubject('data')
    }

    const { result, rerender } = renderHook(
      ({ id }) =>
        useObservables({ id }, null, () => ({
          item: createObservable(),
        })),
      { initialProps: { id: 1 } },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialSubscribeCount = subscribeCount

    // Change props - should not re-subscribe since triggerProps is null
    rerender({ id: 2 })
    rerender({ id: 3 })

    expect(subscribeCount).toBe(initialSubscribeCount)
  })
})
