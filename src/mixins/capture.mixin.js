import { outputFile } from 'fs-extra';
import mixin from '../libs/mixin';
import getNodeId from './helpers/getNodeId.helper';
import log, { red, cyan } from '../libs/log';

const ERR_INVALID_CLIP = 'Invalid clip';
const ERR_ELEMENT_NOT_FOUND = 'No element with the given selector have been found.';

/**
 * @name isValidClip
 * @desc Returns true if the given object is a valid clip object.
 * @param {object} [clip={}] - object to validate
 * @return {boolean}
 */
function isValidClip(clip = {}) {
  return Object.prototype.hasOwnProperty.call(clip, 'width')
    && Object.prototype.hasOwnProperty.call(clip, 'height')
    && Object.prototype.hasOwnProperty.call(clip, 'top')
    && Object.prototype.hasOwnProperty.call(clip, 'left');
}

/**
 * @name getElmClip
 * @desc Get clip object for the given element.
 * @param {object} [DOM] - Tab DOM instance
 * @param {string} [selector=null] - Element's selector
 * @return {Promise<object>|Promise<null>}
 */
async function getElmClip(DOM, selector = null) {
  try {
    const nodeId = await getNodeId(DOM, selector);

    if (!nodeId) {
      throw new Error(ERR_ELEMENT_NOT_FOUND);
    }

    const { model: { margin, width, height } } = await DOM.getBoxModel({ nodeId });
    const clip = {
      width,
      height,
      left: margin[0],
      top: margin[1],
    };

    return clip;
  } catch (err) {
    log(red('err', err));
    return null;
  }
}

/**
 * @name applyClip
 * @desc Apply clip on the given tab
 * @param {Tab} [tab] - Tab's instance
 * @param {ClipObject|string} [clip] - Clip object
 * @return {Promise<boolean>}
 */
async function applyClip(tab, clip) {
  const { Emulation, DOM } = tab.client;

  if (typeof clip === 'string') {
    return applyClip(tab, await getElmClip(DOM, clip));
  } else if (!isValidClip(clip)) {
    throw new Error(ERR_INVALID_CLIP);
  }

  await Emulation.setVisibleSize({ width: clip.width, height: clip.height });
  await Emulation.forceViewport({ x: clip.left, y: clip.top, scale: 1 });
  log(cyan('info'), 'Clip applied:', JSON.stringify(clip, null, 2));
  return true;
}

/**
 * @name captureBase64
 * @desc Capture browser window or full page and return base64
 * @param {CaptureOptions} [options={}] - Capture options
 * @param {string} [options.format='png'] - Image compression format (defaults to png).
 * Allowed values: jpeg, png.
 * @param {number} [options.quality=100] - Compression quality from range [0..100] (jpeg only).
 * @param {boolean} [options.fullPage=true] - Capture full page (defaults to true)
 * @param {ClipObject} [options.clip] - Object rappresenting the are of the page that sould be
 * captured.
 * Example: {
 *   width: ...
 *   width: ...
 *   left: ...
 *   right: ...
 * }
 * @return {Promise<string>}
 * @public
 */
async function captureBase64({ format = 'png', quality = 100, fullPage = true, clip } = {}) {
  const { Page, DOM } = this.client;

  await DOM.enable();

  // Cache layout metrics so that it can be used later on in the code
  // to restore everything as it is
  const layoutMetrics = await Page.getLayoutMetrics();

  // If you want to take a screenshot of the whole page but the clip (for whole page) is not set
  // then generate the clip then call this method again with a the newly generated clip object.
  if (fullPage && !clip) {
    return this.captureBase64({
      format,
      quality,
      fullPage,
      clip: {
        width: layoutMetrics.contentSize.width,
        height: layoutMetrics.contentSize.height,
        top: 0,
        left: 0,
      },
    });
  } else if (clip) {
    // If a clip is set instead just apply it.
    // which means:
    // - set correct width and height
    // - set correct top and left offset
    await applyClip(this, clip);
  }

  // Generate the creenshot
  const { data: base64 } = await Page.captureScreenshot({ format, quality, fromSurface: true });

  // If a clip was applied then remove it
  if (clip) {
    log('Applying browser window clip...');
    await applyClip(this, {
      width: layoutMetrics.visualViewport.clientWidth,
      height: layoutMetrics.visualViewport.clientHeight,
      top: layoutMetrics.visualViewport.pageY,
      left: layoutMetrics.visualViewport.pageX,
    });
  }

  return base64;
}

/**
 * @name captureBuffer
 * @desc Create a buffer of page capture
 * @param {CaptureOptions} [options={}] - Capture options
 * @return {Promise<Buffer>}
 * @public
 */
async function captureBuffer(...args) {
  const base64 = await this.captureBase64(...args);
  return new Buffer(base64, 'base64');
}

/**
 * @name capture
 * @desc Capture page and save it on disk.
 * @param {string} [filename] - Filename of page capture
 * @param {CaptureOptions} [options={}] - Capture options
 * @return {Promise<void>}
 * @public
 */
async function capture(filename, config) {
  const buffer = await this.captureBuffer(config);
  await outputFile(filename, buffer);
}

export default mixin({ captureBase64, captureBuffer, capture });
