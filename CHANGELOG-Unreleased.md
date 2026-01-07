### Highlights

**React 19 Support**

WatermelonDB now requires React 19.1.1+ and React Native 0.81+. This is a major upgrade that brings the library in line with the latest React ecosystem.

**New `useObservables` Hook**

A new React hook that provides the same functionality as `withObservables` but with a modern hooks-based API:

```javascript
import { useObservables } from '@nozbe/watermelondb/react'

function TaskView({ taskId }) {
  const { isLoading, data, error } = useObservables({ taskId }, ['taskId'], ({ taskId }) => ({
    task: database.get('tasks').findAndObserve(taskId),
    comments: database.get('comments').query(Q.where('task_id', taskId)).observe(),
  }))

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  const { task, comments } = data
  return <Task task={task} comments={comments} />
}
```

### BREAKING CHANGES

- **Minimum React version is now 19.1.1** - React 18.x is no longer supported
- **Minimum React Native version is now 0.81.5** - Older React Native versions are no longer supported
- **`withObservables` now renders `null` before data is available** - Previously, when observables emitted synchronously in the constructor, the component could render immediately. Now there is always one "null" render before data. Update your components to handle loading state if you relied on the previous behavior.
- Removed `@nozbe/watermelondb_expect` internal test dependency - This was an internal testing utility that is no longer needed
- Removed internal garbage collector (`garbageCollector.js`) - No longer needed with hooks-based implementation
- Removed internal `helpers.js` module - Simplified implementation no longer requires this

### Deprecations

### New features

- **New `useObservables` hook** - A React hook for subscribing to observables. Returns `{ isLoading, data, error }` with modern naming conventions matching React Query/SWR patterns.

### Fixes

- [LokiJS] Multitab sync issue fix
- [Android] Added linker flag for building with 16kB page alignment
- [TS] make catchError visible to typescript
- [TS] Updated TypeScript types for React 19 compatibility (`JSX.LibraryManagedAttributes` -> `React.JSX.LibraryManagedAttributes`)

### Performance

### Changes

- `withObservables` HOC rewritten to use React hooks internally
- `WithObservables` component rewritten with cleaner design using `useObservables` hook
- `withHooks` simplified (uses `createElement` directly instead of custom factory)
- Migrated tests from `@testing-library/react-hooks` to `@testing-library/react`
- Updated better-sqlite3 to 11.9.1
- Updated React Native to 0.81.5
- Updated React Native Windows to 0.81.0
- Updated `@types/react` to ^19.1.0
- Updated `@typescript-eslint/eslint-plugin` to ^7.13.0

### Internal

- Updated internal dependencies
- Updated documentation scripts
- Added `jest-environment-jsdom` for React testing
- Added `@testing-library/react` ^16.3.0
- Added `@types/react-dom` ^19.1.0
- Updated all `@react-native/*` packages to 0.81.5
