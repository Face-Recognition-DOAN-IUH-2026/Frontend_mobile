export function devLog(...args: unknown[]) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function devError(...args: unknown[]) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
