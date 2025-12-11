// Early setup file that runs before Jest initializes
// This ensures strip-ansi is available for Jest's internal dependencies

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const originalRequire = Module.prototype.require

// Intercept require calls to ensure strip-ansi resolves to the CJS version
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'strip-ansi') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('strip-ansi-cjs')
    } catch {
      // Fallback to regular strip-ansi
      return originalRequire.apply(this, [id, ...args])
    }
  }
  return originalRequire.apply(this, [id, ...args])
}
