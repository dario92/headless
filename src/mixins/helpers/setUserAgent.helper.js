import log, { red, cyan } from '../../libs/log';

/**
 * @name setUserAgent
 * @desc Given in input the tab network instance and user agent string
 * this function will set page's user agent string to the given string.
 * @param {object} [Network] - Tab's network API
 * @param {string} [userAgent=null] - User agent string
 * @return {Promise<void>}
 */
export default async function setUserAgent(Network, userAgent = null) {
  try {
    if (userAgent) {
      await Network.setUserAgentOverride({ userAgent });
      log(cyan('info'), 'User-Agent set to:', userAgent);
    }
  } catch (err) {
    log(red('error'), err);
  }
}
