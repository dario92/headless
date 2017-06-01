import { EventEmitter } from 'events';
import CRI from 'chrome-remote-interface';
import log, { red } from './libs/log';
import navigate from './mixins/navigate.mixin';
import capture from './mixins/capture.mixin';
import device from './mixins/device.mixin';
import { TAB_REDY_EVENT, TAB_INIT_ERROR_EVENT, TAB_CLOSE_EVENT } from './constants';

@navigate
@capture
@device
export default class Tab extends EventEmitter {
  client = null;
  info = null;

  async init() {
    try {
      this.info = await CRI.New();
      this.client = await CRI({ tab: this.info });
      this.emit(TAB_REDY_EVENT);
      log(`Created new tab ${this.info.id}`);
    } catch (err) {
      log(red('An error happened while initialising tab:'), err);
      this.emit(TAB_INIT_ERROR_EVENT);
    }
  }

  async close() {
    try {
      const { id } = this.info;
      await CRI.Close({ id });
      this.emit(TAB_CLOSE_EVENT);
      log(`Closed tab ${this.info.id}`);
    } catch (err) {
      log(red('An error happens while closing tab: '), err);
    }
  }
}
