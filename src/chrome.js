import psaux from 'psaux';
import { spawn } from 'child_process';
import createQueue from 'async.queue';
import getDefaultChromeBinary from './libs/get-chrome-binary';
import log, { yellow } from './libs/log';
import Tab, { TAB_REDY_EVENT, TAB_INIT_ERROR_EVENT, TAB_CLOSE_EVENT } from './tab';


const DEFAULT_CHROME_ARG = [
  '--headless',
  '--remote-debugging-port=9222',
  '--disable-gpu',
];

const DEFAULT_MAX_TABS = 10;

export default class Chrome {
  binary = null;
  args = null;
  cp = null;
  queue = null;

  constructor({ chromeBinary = getDefaultChromeBinary(), args, maxTabs = DEFAULT_MAX_TABS } = {}) {
    this.binary = chromeBinary;
    this.args = [
      ...args || [],
      ...DEFAULT_CHROME_ARG,
    ];

    this.queue = createQueue(Chrome.createTabWorker, maxTabs);
  }

  /**
   * @name startup
   * @desc Spawn chrome in headless mode in a child_process and cache the id.
   * If chrome is already running in headless mode it won't create a new instance and no
   * child_process will be created, so when `close` is called the running instace will
   * not be killed
   * @public
   * @return {Promise<Chrome>}
   * @module Chrome
   */
  async startup() {
    const chromeProcessInfo = await this.getProcessInfo();
    const isAlreadyRunning = chromeProcessInfo && !!chromeProcessInfo.length;

    if (!isAlreadyRunning) {
      this.cp = await this.spawnHeadlessChrome();
      log('Chrome was successfully launched in headless mode...');
    } else {
      log(yellow('Chrome is already running in headless mode...'));
    }

    return this;
  }

  /**
   * @name spawnHeadlessChrome
   * @desc Spawn chrome in headless mode and resolve the promise with child_process instace.
   * @private
   * @return {Promise<ChildProcess>}
   * @module Chrome
   */
  spawnHeadlessChrome() {
    return new Promise((resolve) => {
      const resolveDelay = 1000;
      const cp = spawn(this.binary, this.args);

      // Give the time to chrome actually startup
      // than resolve the promise
      setTimeout(() => {
        resolve(cp);
      }, resolveDelay);
    });
  }

  /**
   * @name getProcessInfo
   * @desc Get info about the chrome process
   * e.g
   * {
   *   user: '...',
   *   pid: '...',
   *   cpu: '...',
   *   mem: '...',
   *   vsz: '...',
   *   rss: '...',
   *   tt: '...',
   *   stat: '...',
   *   started: '...',
   *   time: '...',
   *   command: '...'
   * }
   * @private
   * @return {Promise<Object>}
   * @module Chrome
   */
  async getProcessInfo() {
    const list = await psaux();
    const chromeProcess = list.query({ command: `~${this.binary}` });
    return chromeProcess;
  }

  /**
   * @name createTabWorker
   * @desc Queue worker that handles the creation of a new tab.
   * When a new tab is created succfully the `onTabReady` callback is invoked with the new tab
   * instace of object as the first argument. When tab is closed or an initialisation error
   * happens the task will be completed.
   * @private
   * @param {object} [task] - Task info that will be processed by the worker
   * @param {function} [task.onTabReady] - Callback that is called when the tab is
   * succfully created
   * @param {function} [done] - Callback function to complete the task and clear it from the queue
   * @return {Promise<void>}
   * @module Chrome
   */
  static async createTabWorker({ onTabReady }, done) {
    const tab = new Tab();

    tab.once(TAB_REDY_EVENT, () => onTabReady(tab));
    tab.once(TAB_INIT_ERROR_EVENT, (e, err) => done(err));
    tab.once(TAB_CLOSE_EVENT, () => done());
  }

  /**
   * @name createTab
   * @desc Create a new tab and return the instance.
   * @public
   * @return {Promise<Tab>}
   * @module Chrome
   */
  createTab() {
    return new Promise((resolve, reject) => {
      this.queue.push({
        onTabReady: (tab) => {
          resolve(tab);
        },
      }, (err) => {
        try {
          if (err) {
            reject(err);
          }
        } catch (e) {
          log('err', e);
        }
      });
    });
  }

  /**
   * @name close
   * @desc If a child process was created to run headless chrome, this method will kill
   * that process. Otherwise nothing will happen when calling this moethod.
   * @public
   * @return {Promise<void>}
   * @module Chrome
   */
  close() {
    return new Promise((resolve, reject) => {
      try {
        if (this.cp) {
          this.cp.kill();

          // Give some time to the child process to cleanup before terminating.
          setTimeout(resolve, 100);
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}
