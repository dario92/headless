import path from 'path';
import { outputFile, remove as removeFile } from 'fs-extra';
import debounce from 'lodash.debounce';
import mixin from '../libs/mixin';
import isUrl from '../libs/isURL';
import uuid from '../libs/uuid';
import log, { red, cyan, yellow } from '../libs/log';
import setUserAgent from './helpers/setUserAgent.helper';

const TEMP_FILES_FOLDER = path.resolve(__dirname, '../../.tmp');
const PENDING_REQUEST_CHECK_INTERVAL = 800;
const DEFAULT_SETTINGS = {
  maxRetry: 3,
  referrer: '',
  timeout: 30000,
  ua: null,
  headers: {},
};

/**
 * @name getTmpHtmlFilename
 * @desc Generate path to temporary html file.
 * @return {string}
 */
function getTmpHtmlFilename() {
  return path.resolve(TEMP_FILES_FOLDER, `./${uuid()}.html`);
}

/**
 * @name getFileUrl
 * @desc Given a file path this function will return the file url using the file protocol.
 * @param {string} [file] - Absolute path to file
 * @return {string}
 */
function getFileUrl(file) {
  return `file://${file}`;
}

/**
 * @name setRequestHeaders
 * @desc Set the requests default headers
 * @param {object} [Network] - Tab's network API
 * @param {string} [headers] - Object of headers
 * @return {Promise<void>}
 */
async function setRequestHeaders(Network, headers = null) {
  try {
    if (headers) {
      await Network.setExtraHTTPHeaders({ headers });
      log(cyan('info'), 'Default headers set to:', JSON.stringify(headers, null, 2));
    }
  } catch (err) {
    log(red('error'), err);
  }
}

/**
 * @name waitUntilFullyLoaded
 * @desc Wait untill all the requests have been processed then resolve the promise.
 * If a timeout is specified and all the requests have not been processed within the
 * the defined timeout then the promise will be rejected.
 * @param {object} [Network] - Tab's network API
 * @param {number} [timeout]
 * @return {Promise<void>}
 */
function waitUntilFullyLoaded(Network, timeout) {
  return new Promise((resolve, reject) => {
    // Array of all pending requests for this page
    let pendingRequests = [];

    // This is a flag that is set to true when the page is fully loaded
    // or when user's defined timeout is reached.
    let done = false;

    // This method will resolve the promise when all the pending request
    // have been processed and also set `done` to true.
    const resolveIfPageFullyLoaded = debounce(() => {
      if (!pendingRequests.length && !done) {
        done = true;
        resolve();
      }
    }, PENDING_REQUEST_CHECK_INTERVAL);

    // This is callback method that will be called when a response is received,
    // server from cache or failed to load. When the callback is invoked it will remove
    // the processed request from `pendingRequests` and then resolve the promise if
    // all requests have been processed.
    const onRequestProcessed = ({ requestId }) => {
      if (!done) {
        pendingRequests = pendingRequests.filter(id => requestId !== id);
        resolveIfPageFullyLoaded();
      }
    };

    // When a new request is made add it the `pendingRequests` array.
    Network.requestWillBeSent(({ requestId }) => {
      if (!done) {
        pendingRequests.push(requestId);
      }
    });

    Network.responseReceived(onRequestProcessed);
    Network.loadingFailed(onRequestProcessed);
    Network.requestServedFromCache(onRequestProcessed);

    if (timeout) {
      setTimeout(() => {
        if (!done) {
          const err = new Error('Page didn\'t load within the user\'s defined timeout.');
          reject(err);
        }
      }, timeout);
    }
  });
}

/**
 * @name loadUrl
 * @desc Given a url navigate to the page and wait until the page is completly loaded
 * @param {Tab} [tab] - Instance of tab
 * @param {string} [url] - url to navigate to
 * @param {object} [userSettings] - Available settings are:
 * {
 *  maxRetry: 3,
 *  referrer: '',
 *  timeout: 30000,
 *  ua: null,
 *  headers: {},
 * }
 * @return {Promise<void>}
 */
async function loadUrl(tab, url, userSettings = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...userSettings };

  try {
    const { Page, Network, DOM } = tab.client;

    await Network.enable();
    await Page.enable();
    await DOM.enable();

    // Set User-Agent if needed
    await setUserAgent(Network, settings.ua);

    // Set extra request headers if needed
    if (Object.keys(settings.headers).length) {
      await setRequestHeaders(Network, { ...DEFAULT_SETTINGS.headers, ...settings.headers });
    }

    const frameId = await Page.navigate({ url, referrer: settings.referrer });
    await waitUntilFullyLoaded(Network);
    log('loaded');

    return frameId;
  } catch (err) {
    log(red('error'), err);

    if (settings.maxRetry > 0) {
      const maxRetry = settings.maxRetry - 1;
      log(yellow('warn'), 'Retrying to load page...', `(${maxRetry} attempt left)`);
      return loadUrl(tab, url, { ...settings, maxRetry });
    }

    return false;
  }
}

/**
 * @name loadHtml
 * @desc Given a url navigate to the page and wait until the page is completly loaded
 * @param {Tab} [tab] - Instance of tab
 * @param {string} [html] - html to load in the tab
 * @param {object} [userSettings] - Available settings are:
 * {
 *  maxRetry: 3,
 *  referrer: '',
 *  timeout: 30000,
 *  ua: null,
 *  headers: {},
 * }
 * @return {Promise<void>}
 */
async function loadHtml(tab, html, settings = {}) {
  try {
    const file = getTmpHtmlFilename();
    await outputFile(file, html);
    const fileUrl = getFileUrl(file);
    const frameId = await loadUrl(tab, fileUrl, settings);
    await removeFile(file);

    return frameId;
  } catch (err) {
    log(red('error'), err);
    return false;
  }
}

async function navigate(input, settings) {
  this.frame = isUrl(input)
    ? await loadUrl(this, input, settings)
    : await loadHtml(this, input, settings);
}

export default mixin({ navigate });
