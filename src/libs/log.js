/* eslint no-console:0  */

export default (...args) => {
  // console.log(...[
  //   '\x1b[35m[headless]\x1b[0m',
  //   ...args,
  // ]);
};

export function red(input) {
  return `\x1b[31m${input}\x1b[0m`;
}

export function green(input) {
  return `\x1b[32m${input}\x1b[0m`;
}

export function yellow(input) {
  return `\x1b[33m${input}\x1b[0m`;
}

export function cyan(input) {
  return `\x1b[36m${input}\x1b[0m`;
}
