// @flow
import { createElement } from 'react'
import hoistNonReactStatics from 'hoist-non-react-statics'
import type { Observable } from 'rxjs'

import useObservables, { type ObservableConvertible } from '../useObservables'

type UnaryFn<A, R> = (a: A) => R
type HOC<Base, Enhanced> = UnaryFn<React$ComponentType<Base>, React$ComponentType<Enhanced>>

export type ExtractTypeFromObservable = <T>(value: Observable<T> | ObservableConvertible<T>) => T

type TriggerProps<A> = $Keys<A>[] | null
type GetObservables<A, B> = (props: A) => B

type WithObservables<Props, ObservableProps> = HOC<
  { ...$Exact<Props>, ...$ObjMap<ObservableProps, ExtractTypeFromObservable> },
  Props,
>

/**
 * Higher-Order Component that injects values from Observables as props.
 *
 * Every time one of the `triggerProps` changes, `getObservables()` is called
 * and the returned Observables are subscribed to.
 *
 * Every time one of the Observables emits a new value, the matching inner prop is updated.
 *
 * You can return multiple Observables in the function. You can also return arbitrary objects that have
 * an `observe()` function that returns an Observable.
 *
 * The inner component will not render until all supplied Observables return their first values.
 * If `triggerProps` change, renders will also be paused until the new Observables emit first values.
 *
 * If you only want to subscribe to Observables once (the Observables don't depend on outer props),
 * pass `null` to `triggerProps`.
 *
 * Errors are re-thrown in render(). Use React Error Boundary to catch them.
 *
 * @example
 * ```js
 * withObservables(['task'], ({ task }) => ({
 *   task: task,
 *   comments: task.comments.observe()
 * }))
 * ```
 */
const withObservables = <PropsInput: { ... }, ObservableProps: { ... }>(
  triggerProps: TriggerProps<PropsInput>,
  getObservables: GetObservables<PropsInput, ObservableProps>,
): WithObservables<PropsInput, ObservableProps> => {
  return (BaseComponent) => {
    function WithObservablesWrapper(props: PropsInput): React$Node {
      const { isLoading, data, error } = useObservables(props, triggerProps, getObservables)

      if (isLoading) {
        return null
      }

      if (error) {
        // Re-throw error in render for Error Boundary handling
        throw error
      }

      return createElement(BaseComponent, { ...props, ...data })
    }

    // Set display name for debugging
    // $FlowFixMe[prop-missing] - displayName is a valid React pattern
    if (process.env.NODE_ENV !== 'production') {
      const baseName = BaseComponent.displayName || BaseComponent.name || 'Component'
      const renderedTriggerProps = triggerProps ? triggerProps.join(',') : 'null'
      ;(WithObservablesWrapper: any).displayName = `withObservables[${renderedTriggerProps}](${baseName})`
    }

    return hoistNonReactStatics(WithObservablesWrapper, BaseComponent)
  }
}

export default withObservables

// Re-export types for convenience
export type { ObservableConvertible, UseObservablesResult } from '../useObservables'
