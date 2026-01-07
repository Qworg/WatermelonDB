// @flow
import { createElement } from 'react'

type HOC<Base, Enhanced> = (React$ComponentType<Base>) => React$ComponentType<Enhanced>
type GetNewProps = <T: { ... }>(T) => T
type Props$Merge<A, B> = { ...$Exact<A>, ...$Exact<B> }
type EnhancedProps<PropsInput, NewProps> = Props$Merge<PropsInput, $Call<GetNewProps, NewProps>>

/**
 * Higher-Order Component that allows using hooks to transform props.
 *
 * @example
 * ```js
 * const enhance = withHooks(({ userId }) => {
 *   const theme = useTheme()
 *   return { theme, formattedId: `user-${userId}` }
 * })
 *
 * const EnhancedComponent = enhance(MyComponent)
 * ```
 */
export default function withHooks<PropsInput: { ... }, NewProps: { ... }>(
  hookTransformer: (props: PropsInput) => NewProps,
): HOC<EnhancedProps<PropsInput, NewProps>, PropsInput> {
  return (BaseComponent) => {
    function WithHooks(props: PropsInput): React$Node {
      const newProps = hookTransformer(props)
      return createElement(BaseComponent, { ...props, ...newProps })
    }

    // $FlowFixMe[prop-missing] - displayName is a valid React pattern
    if (process.env.NODE_ENV !== 'production') {
      const baseName = BaseComponent.displayName || BaseComponent.name || 'Component'
      ;(WithHooks: any).displayName = `withHooks(${baseName})`
    }

    return WithHooks
  }
}
