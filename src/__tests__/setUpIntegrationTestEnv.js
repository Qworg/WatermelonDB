// Note: For native integration tests, we use the global expect from jest or cavy
// If running outside jest, you may need to polyfill this

global.Buffer = class FakeBuffer {}
if (!global.process) {
  global.process = {}
}
if (!global.process.version) {
  // $FlowFixMe
  global.process.version = 'bla'
}

// expect should be available globally from jest or the test runner
