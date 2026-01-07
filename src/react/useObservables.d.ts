import { Observable } from 'rxjs'

export interface ObservableConvertible<T> {
  readonly observe: () => Observable<T>
}

type ExtractObservableType<T> =
  T extends Observable<infer U> ? U : T extends ObservableConvertible<infer U> ? U : T

export type ExtractedObservables<T> = {
  [K in keyof T]: ExtractObservableType<T[K]>
}

export interface UseObservablesResult<T> {
  isLoading: boolean
  data: T | null
  error: Error | null
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
 * ```ts
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
export default function useObservables<PropsInput extends object, ObservableProps extends object>(
  props: PropsInput,
  triggerProps: Array<keyof PropsInput> | null,
  getObservables: (props: PropsInput) => ObservableProps,
): UseObservablesResult<ExtractedObservables<ObservableProps>>
