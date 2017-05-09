import mixin from '../libs/mixin';
import log, { red, cyan } from '../libs/log';
import setUserAgent from './helpers/setUserAgent.helper';
import devices from '../data/devices.json';
import networkCondictionsMapping from '../data/networkCondictionsMapping.json';

const ERR_NOT_VALID_DEVICE = '"{deviceName}" is not a valid device name.';
const ERR_EMULATION_NOT_SUPPORTED = `Emulation is not supported in this Chrome version. Please
update to latests version`;
const ERR_NOT_VALID_NET_CON_NAME = `"{name}" is not a valid netowrk condiction preset.
The avaialbe presets are ${Object.keys(networkCondictionsMapping).join(', ')}`;
const ERR_INVALID_DEVICE_CONFIG = 'Device configuration is invalid';

/**
 * @name applyDeviceMetricsOverride
 * @desc Overrides the values of device screen dimensions (window.screen.width,
 * window.screen.height, window.innerWidth, window.innerHeight, and
 * "device-width"/"device-height"-related CSS media query results).
 * @param {Emulation} [Emulation] - Tab's emulation API
 * @param {object} [config] - Device metrices to override. e.g
 * {
 *   "mobile": true,
 *   "width": 375,
 *   "height": 667,
 *   "deviceScaleFactor": 1,
 *   "fitWindow": true,
 * }
 * for more info checkout https://chromedevtools.github.io/debugger-protocol-viewer/tot/Emulation/#method-setDeviceMetricsOverride
 * @return {Promise<void>}
 */
async function applyDeviceMetricsOverride(Emulation, config) {
  const emulationMetrics = {
    width: config.width,
    height: config.height,
    deviceScaleFactor: config.deviceScaleFactor || 0,
    mobile: config.mobile || false,
    fitWindow: config.fitWindow || false,
    screenWidth: config.screenWidth || config.width,
    screenHeight: config.screenHeight || config.height,
  };

  await Promise.all([
    Emulation.setDeviceMetricsOverride(emulationMetrics),
    Emulation.setVisibleSize(emulationMetrics),
  ]);

  log(cyan('info'), 'Device metrics have been set to:', JSON.stringify(emulationMetrics, null, 2));
}

/**
 * @name applyNetworkCondictions
 * @desc Apply network condiction preset.
 * @param {Network} [Network] - Tab's network API
 * @param {string} [name] - Network condiction preset name
 * @return {Promise<void>}
 */
function applyNetworkCondictions(Network, name) {
  const config = networkCondictionsMapping[name];

  if (!config) {
    const err = ERR_NOT_VALID_NET_CON_NAME.replace('{name}', name);
    log(red('error'), err);
    throw new Error(err);
  }

  log(cyan('info'), 'Netowrk condiction set to', JSON.stringify(config, null, 2));
  return Network.emulateNetworkConditions(config);
}

/**
 * @name applyDeviceConfig
 * @desc Apply device configuration
 * @param {object} [client] - Tab's client
 * @param {config} [config] - Device configuration to apply
 * @return {Promise<void>}
 */
async function applyDeviceConfig(client, config) {
  const { Emulation, Network } = client;
  const { result: canEmulate } = await Emulation.canEmulate();

  // Make sure this version of chrome supports emulation.
  // If it doesn't then throw and error
  if (!canEmulate) {
    throw new Error(ERR_EMULATION_NOT_SUPPORTED);
  }

  // Apply device metrics like width, height etc..
  await applyDeviceMetricsOverride(Emulation, config);

  // Set User-Agent if needed
  await setUserAgent(Network, config.ua);

  // Set network condictions if needed.
  if (config.network) {
    await applyNetworkCondictions(Network, config.network);
  }
}

async function setDevice(config = {}) {
  let device;

  if (typeof config === 'string') {
    device = devices[config];

    if (!device) {
      throw new Error(ERR_NOT_VALID_DEVICE.replace('{deviceName}', config));
    }
  } else if (typeof config === 'object') {
    device = config;
  } else {
    throw new Error(ERR_INVALID_DEVICE_CONFIG);
  }

  await applyDeviceConfig(this.client, device);
  this.device = device;
}

function getDevice() {
  return this.device || null;
}

export default mixin({ setDevice, getDevice });
