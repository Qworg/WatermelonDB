// @flow
import { useState, useEffect, useRef, useMemo } from 'react'
import type { Observable } from 'rxjs'

import identicalArrays from '../utils/fp/identicalArrays'
import { subscribe, hasOwn, type ObservableConvertible } from './useObservables'

type ExtractType = <T>(value: Observable<T> | ObservableConvertible<T>) => T

type Props<ObservableProps> = {
  /** Array of values that trigger re-subscription when changed */
  resetOn: any[],
  /** Object of observables to subscribe to */
  observables: ObservableProps,
  /** Render function receiving the resolved observable values */
  children: ($ObjMap<ObservableProps, ExtractType>) => React$Node,
}

/**
 * Component version of withObservables using render props pattern.
 *
 * @example
 * ```jsx
 * <WithObservables
 *   resetOn={[taskId]}
 *   observables={{
 *     task: database.get('tasks').findAndObserve(taskId),
 *     comments: task.comments.observe()
 *   }}
 * >
 *   {({ task, comments }) => <TaskView task={task} comments={comments} />}
 * </WithObservables>
 * ```
 */
export default function WithObservables<ObservableProps: { ... }>({
  resetOn,
  observables,
  children,
}: Props<ObservableProps>): React$Node {
  const [state, setState] = useState<{
    isLoading: boolean,
    data: Object | null,
    error: Error | null,
  }>({
    isLoading: true,
    data: null,
    error: null,
  })

  // Track resetOn values to detect changes
  const prevResetOnRef = useRef<any[]>(resetOn)
  const resetOnChanged = !identicalArrays(prevResetOnRef.current, resetOn)
  if (resetOnChanged) {
    prevResetOnRef.current = resetOn
  }

  // Memoize observables - only use reference from resetOn changes
  const resetKey = prevResetOnRef.current
  const memoizedObservables = useMemo(
    () => observables,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey],
  )

  useEffect(() => {
    let isSubscribed = true
    let subscriptions: Array<() => void> = []
    const values: { [string]: any } = {}
    let valueCount = 0

    setState({ isLoading: true, data: null, error: null })

    const keys = Object.keys(memoizedObservables)
    const keyCount = keys.length

    if (keyCount === 0) {
      setState({ isLoading: false, data: {}, error: null })
      return
    }

    const unsubscribeAll = () => {
      isSubscribed = false
      subscriptions.forEach((unsub) => unsub())
      subscriptions = []
    }

    keys.forEach((key) => {
      if (!isSubscribed) return

      // $FlowFixMe
      const subscribable = memoizedObservables[key]
      subscriptions.push(
        subscribe(
          subscribable,
          (value) => {
            if (!isSubscribed) return
            const isFirst = !hasOwn(values, key)
            if (isFirst) valueCount += 1
            values[key] = value
            if (valueCount === keyCount) {
              setState({ isLoading: false, data: { ...values }, error: null })
            }
          },
          (error) => {
            if (!isSubscribed) return
            unsubscribeAll()
            setState({ isLoading: false, data: null, error })
          },
          () => {},
        ),
      )
    })

    return unsubscribeAll
  }, [memoizedObservables])

  if (state.isLoading) {
    return null
  }

  if (state.error) {
    throw state.error
  }

  return children((state.data: any))
}

// $FlowFixMe[prop-missing] - displayName is a valid React pattern
if (process.env.NODE_ENV !== 'production') {
  ;(WithObservables: any).displayName = 'WithObservables'
}
