// @flow
import { useState, useEffect, useRef, useMemo } from 'react'
import type { Observable } from 'rxjs'
import identicalArrays from '../utils/fp/identicalArrays'

export interface ObservableConvertible<T> {
  observe(): Observable<T>;
}

type Unsubscribe = () => void

/**
 * Subscribe to a value that may be an Observable, ObservableConvertible, or WatermelonDB model/query.
 * @internal Exported for use by WithObservablesComponent
 */
export function subscribe(
  value: any,
  onNext: (any) => void,
  onError: (Error) => void,
  onComplete: () => void,
): Unsubscribe {
  const wmelonTag = value && value.constructor && value.constructor._wmelonTag
  if (wmelonTag === 'model') {
    onNext(value)
    return value.experimentalSubscribe((isDeleted) => {
      if (isDeleted) {
        onComplete()
      } else {
        onNext(value)
      }
    })
  } else if (wmelonTag === 'query') {
    return value.experimentalSubscribe(onNext)
  } else if (typeof value.observe === 'function') {
    const subscription = value.observe().subscribe(onNext, onError, onComplete)
    return () => subscription.unsubscribe()
  } else if (typeof value.subscribe === 'function') {
    const subscription = value.subscribe(onNext, onError, onComplete)
    return () => subscription.unsubscribe()
  }

  // eslint-disable-next-line no-console
  console.error(`[useObservables] Value passed doesn't appear to be observable:`, value)
  throw new Error(
    `[useObservables] Value passed doesn't appear to be observable. See console for details`,
  )
}

/**
 * Check if object has own property
 * @internal Exported for use by WithObservablesComponent
 */
export function hasOwn(obj: Object, key: string): boolean {
  // $FlowFixMe[method-unbinding] - safe to unbind hasOwnProperty
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function getTriggeringProps<PropsInput: { ... }>(
  props: PropsInput,
  propNames: $Keys<PropsInput>[] | null,
): any[] {
  if (!propNames) {
    return []
  }
  return propNames.map((name) => props[name])
}

export type UseObservablesResult<T> = {
  isLoading: boolean,
  data: T | null,
  error: Error | null,
}

/**
 * React hook to subscribe to observables and get their values.
 *
 * @param props - The props object containing values used by getObservables
 * @param triggerProps - Array of prop keys that trigger re-subscription when changed, or null
 * @param getObservables - Function that returns an object of observables
 * @returns Object with isLoading, data (combined values), and error
 *
 * @example
 * ```js
 * const { isLoading, data, error } = useObservables(
 *   { taskId },
 *   ['taskId'],
 *   ({ taskId }) => ({
 *     task: database.get('tasks').findAndObserve(taskId),
 *     comments: database.get('comments').query(Q.where('task_id', taskId)).observe()
 *   })
 * )
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error error={error} />
 *
 * const { task, comments } = data
 * ```
 */
export default function useObservables<PropsInput: { ... }, ObservableProps: { ... }>(
  props: PropsInput,
  triggerProps: $Keys<PropsInput>[] | null,
  getObservables: (props: PropsInput) => ObservableProps,
): UseObservablesResult<
  $ObjMap<ObservableProps, <T>(Observable<T> | ObservableConvertible<T>) => T>,
> {
  const [state, setState] = useState<{
    isLoading: boolean,
    data: Object | null,
    error: Error | null,
  }>({
    isLoading: true,
    data: null,
    error: null,
  })

  // Track trigger props with a ref to detect changes
  const prevTriggerPropsRef = useRef<any[]>(getTriggeringProps(props, triggerProps))
  const currentTriggerProps = getTriggeringProps(props, triggerProps)

  // Check if trigger props changed - if so, update ref
  const triggerPropsChanged = !identicalArrays(prevTriggerPropsRef.current, currentTriggerProps)
  if (triggerPropsChanged) {
    prevTriggerPropsRef.current = currentTriggerProps
  }

  // Memoize observables object - only recreate when trigger props change
  // We use the ref value as dependency to ensure stability
  const triggerPropsKey = prevTriggerPropsRef.current
  const observablesObject = useMemo(
    () => getObservables(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggerPropsKey],
  )

  useEffect(() => {
    let isSubscribed = true
    let subscriptions: Unsubscribe[] = []
    const values: { [string]: any } = {}
    let valueCount = 0

    // Reset to loading state
    setState({ isLoading: true, data: null, error: null })

    const keys = Object.keys(observablesObject)
    const keyCount = keys.length

    // Handle empty observables object
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
      const subscribable = observablesObject[key]
      subscriptions.push(
        subscribe(
          subscribable,
          (value) => {
            if (!isSubscribed) return

            const isFirstEmission = !hasOwn(values, key)
            if (isFirstEmission) {
              valueCount += 1
            }
            values[key] = value

            // Only update state when we have all values
            if (valueCount === keyCount) {
              setState({ isLoading: false, data: { ...values }, error: null })
            }
          },
          (error) => {
            if (!isSubscribed) return
            unsubscribeAll()
            setState({ isLoading: false, data: null, error })
          },
          () => {
            // Completion - no action needed
          },
        ),
      )
    })

    return unsubscribeAll
  }, [observablesObject])

  return state
}
