/* eslint import/first: 0 */

jest.mock('../src/libs/get-chrome-binary');
jest.mock('async.queue');

import Chrome from '../src/chrome';
import getDefaultChromeBinary from '../src/libs/get-chrome-binary';
import mixin from '../src/libs/mixin';
import createQueue from 'async.queue';
import cp from 'child_process';
import * as Tab from '../src/tab';

import {
  DEFAULT_CHROME_ARG,
  DEFAULT_MAX_TABS,
  TAB_REDY_EVENT,
  TAB_INIT_ERROR_EVENT,
  TAB_CLOSE_EVENT,
 } from '../src/constants';

describe('Chrome', () => {
  beforeEach(() => {
    jest.resetModules();
    Tab.default = require.requireActual('../src/tab').default;
  });

  describe('#constructor()', () => {
    test('should use default settings', () => {
      const chrome = new Chrome();

      expect(getDefaultChromeBinary).toBeCalled();
      expect(chrome.args.length === DEFAULT_CHROME_ARG.length).toBeTruthy();
      expect(createQueue.mock.calls[0][1]).toBe(DEFAULT_MAX_TABS);
    });

    test('should use given chrome binary', () => {
      const chromeBinary = 'path/to/mock/chrome/binary';
      const chrome = new Chrome({ chromeBinary });
      expect(chrome.binary).toBe(chromeBinary);
    });

    test('should use given headless options', () => {
      const args = ['--mock-options=test'];
      const chrome = new Chrome({ args });
      expect(chrome.args.includes(args[0])).toBeTruthy();
    });

    test('should initialise queue with max 2 concurrent workers', () => {
      const maxTabs = 2;
      const chrome = new Chrome({ maxTabs });

      const lastCreateQueueCall = createQueue.mock.calls.pop();

      expect(chrome).toBeTruthy();
      expect(lastCreateQueueCall[1]).toBe(maxTabs);
    });
  });

  describe('#startup()', () => {
    test('should return a Promise', () => {
      const chrome = new Chrome();

      chrome.getProcessInfo = jest.fn(() => []);
      chrome.spawnHeadlessChrome = jest.fn();

      expect(chrome.startup()).toBeInstanceOf(Promise);
    });

    test('should create new instance of headless chrome', async () => {
      const chrome = new Chrome();

      chrome.getProcessInfo = jest.fn(() => []);
      chrome.spawnHeadlessChrome = jest.fn();

      await chrome.startup();
      expect(chrome.spawnHeadlessChrome.mock.calls.length).toBe(1);
    });

    test('should use the already running headless chrome instance', async () => {
      const chrome = new Chrome();

      chrome.getProcessInfo = jest.fn(() => [{ pid: 1 }]);
      chrome.spawnHeadlessChrome = jest.fn();
      await chrome.startup();
      expect(chrome.spawnHeadlessChrome.mock.calls.length).toBe(0);
    });
  });

  describe('#spawnHeadlessChrome()', () => {
    test('returns a Promise', async () => {
      const chrome = new Chrome();
      cp.spawn = jest.fn();
      expect(chrome.spawnHeadlessChrome()).toBeInstanceOf(Promise);
    });

    test('should spawn new headless instance using correct binary', async () => {
      const chromeBinary = 'path/to/mock/chrome/binary';
      const chrome = new Chrome({ chromeBinary });

      cp.spawn = jest.fn();

      await chrome.spawnHeadlessChrome();
      expect(cp.spawn.mock.calls[0][0]).toBe(chromeBinary);
    });

    test('should spawn new headless instance using correct options', async () => {
      const args = ['--mock-options=test'];
      const chrome = new Chrome({ args });

      cp.spawn = jest.fn();

      await chrome.spawnHeadlessChrome();
      expect(JSON.stringify(cp.spawn.mock.calls[0][1])).toBe(JSON.stringify([
        ...args,
        ...DEFAULT_CHROME_ARG,
      ]));
    });
  });

  describe('#createTabWorker()', () => {
    test('should fire the onTabReady callback with Tab as first arg', async () => {
      Tab.default = mixin({
        init() { return this.emit(TAB_REDY_EVENT); },
      })(Tab.default);
      const onTabReady = jest.fn();
      await Chrome.createTabWorker({ onTabReady }, jest.fn());
      expect(onTabReady.mock.calls[0][0].constructor.name).toBe('Tab');
    });

    test('should fire done callback with error', async () => {
      Tab.default = mixin({
        init() { return this.emit(TAB_INIT_ERROR_EVENT); },
      })(Tab.default);

      const done = jest.fn();
      const onTabReady = jest.fn();

      await Chrome.createTabWorker({ onTabReady }, done);

      expect(onTabReady.mock.calls.length).toBe(0);
      expect(done.mock.calls.length).toBe(1);
    });

    test('should fire done callback without error', async () => {
      Tab.default = mixin({
        init() { return this.emit(TAB_CLOSE_EVENT); },
      })(Tab.default);

      const done = jest.fn();
      const onTabReady = jest.fn();

      await Chrome.createTabWorker({ onTabReady }, done);

      expect(onTabReady.mock.calls.length).toBe(0);
      expect(done.mock.calls.length).toBe(1);
    });
  });

  describe('#createTab()', () => {
    test('should return promise and resolve with a new Tab instance', async () => {
      Tab.default = mixin({
        init() { return this.emit(TAB_REDY_EVENT); },
      })(Tab.default);

      const chrome = new Chrome();
      chrome.queue = require.requireActual('async.queue')(Chrome.createTabWorker, DEFAULT_MAX_TABS);
      const p = chrome.createTab();
      const tab = await p;

      expect(p).toBeInstanceOf(Promise);
      expect(tab.constructor.name).toBe('Tab');
    });

    test('Tab is should be removed from the queue on close', async () => {
      const delay = 500;
      Tab.default = mixin({
        init() { return setTimeout(() => this.emit(TAB_CLOSE_EVENT), delay); },
      })(Tab.default);

      const chrome = new Chrome();
      chrome.queue = require.requireActual('async.queue')(Chrome.createTabWorker, DEFAULT_MAX_TABS);
      chrome.createTab();

      expect(chrome.queue.tasks.length).toBe(1);
      setTimeout(() => expect(chrome.queue.tasks.length).toBe(0), delay + 100);
    });

    test('Tab is should be removed queue on initialisation error', async () => {
      const delay = 500;
      Tab.default = mixin({
        init() { return setTimeout(() => this.emit(TAB_INIT_ERROR_EVENT), delay); },
      })(Tab.default);

      const chrome = new Chrome();
      chrome.queue = require.requireActual('async.queue')(Chrome.createTabWorker, DEFAULT_MAX_TABS);
      chrome.createTab();

      expect(chrome.queue.tasks.length).toBe(1);
      setTimeout(() => expect(chrome.queue.tasks.length).toBe(0), delay + 100);
    });
  });
});
