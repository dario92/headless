import Chrome from '../../src/chrome';
import tryCatch from '../helpers/noTryCatch';

const chrome = new Chrome();

test('should return a Promise', async () => {
  await expect(chrome.startup()).toBeInstanceOf(Promise);
});

test('should create an instance of a headerless browser', async () => {
  const [err, success] = await tryCatch(chrome.startup());
  await tryCatch(chrome.close());

  expect(!!success).toEqual(true);
  return expect(err).toEqual(null);
});
