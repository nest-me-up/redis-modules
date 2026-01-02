export function getRelevantParams(args: unknown[], paramNames?: string[]): unknown[] {
  if (!paramNames) {
    return args
  }
  if (paramNames.length === 0) {
    return []
  }
  // If paramNames are specified, we assume the method parameters are named objects
  // and we extract the specified properties from them
  return args
    .map((arg, index) => {
      if (args.length === 1 && typeof arg === 'object' && arg !== null) {
        // If there is only one param name and the param is an object we extract the specified property from it
        return paramNames.reduce((acc, name) => {
          if (name in (arg as Record<string, unknown>)) {
            ;(acc as Record<string, unknown>)[name] = (arg as Record<string, unknown>)[name]
          }
          return acc
        }, {})
      } else {
        // For multiple params, return the param value by name if it matches
        const paramName = paramNames[index]
        if (paramName) {
          return arg
        }
      }
      return undefined
    })
    .filter((arg) => arg !== undefined)
}
