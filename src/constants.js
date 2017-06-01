/* eslint import/prefer-default-export: 0 */

export const DEFAULT_CHROME_ARG = [
  '--headless',
  '--remote-debugging-port=9222',
  '--disable-gpu',
];

export const DEFAULT_MAX_TABS = 10;

/* EVENTS */
export const TAB_CLOSE_EVENT = 'TAB_CLOSE_EVENT';
export const TAB_REDY_EVENT = 'TAB_REDY_EVENT';
export const TAB_INIT_ERROR_EVENT = 'TAB_INIT_ERROR_EVENT';
