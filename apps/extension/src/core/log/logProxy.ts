// get a hold of debug method in case dapp replaces it on load
// eslint-disable-next-line no-console
const safeConsoleDebug = console.debug

const copyObject = (target: any) => {
  const keys = Object.keys(target)
  const obj: Record<string, unknown> = {}
  keys.forEach((key) => {
    obj[key] = target[key]
  })
  return obj
}

const handler: ProxyHandler<any> = {
  get: (target, name, receiver) => {
    const obj = copyObject(target)

    if (typeof target[name] === "function") {
      safeConsoleDebug(`[Proxy ${target.constructor.name} - Calling Method: ${String(name)}`) //, obj)
      return new Proxy(target[name], {
        apply: (target, thisArg, argumentsList) => {
          safeConsoleDebug(
            `[Proxy ${target.constructor.name} - Method: ${String(name)}`,
            thisArg,
            argumentsList
          )
          return Reflect.apply(target, thisArg, argumentsList)
        },
      })
    } else
      safeConsoleDebug(
        `[Proxy ${target.constructor.name} - Reading Property: ${String(name)}`,
        String(name) in obj ? obj[String(name)] : "MISSING PROPERTY"
      )

    return Reflect.get(target, name, receiver)
  },
  set: (target, prop, val) => {
    target[prop] = val
    const obj = copyObject(target)
    safeConsoleDebug(`[Proxy ${target.constructor.name} - Updating "${String(prop)}"`, {
      prev: obj[String(prop)],
      next: val,
      obj,
    })
    return Reflect.set(target, prop, val)
  },
}

/* 
  Developer utility that traces all properties and method calls on the object.
  Significant performance hit, do not use in production.
*/
export const logProxy = (sourceObj: any) => {
  return new Proxy(sourceObj, handler)
}