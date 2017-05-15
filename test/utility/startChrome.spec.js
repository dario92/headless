import startChrome from '../../src/index';
import tryCatch from '../helpers/noTryCatch';

test('should create an instance of a headerless browser', async () => {
  const [err, chrome] = await tryCatch(startChrome());
  await chrome.close();

  return expect(err).toEqual(null);
});
