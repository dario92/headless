import startChrome from '../../src/index';
import tryCatch from '../helpers/noTryCatch';

const exec = require('child_process').exec;

test('should create an instance of a headerless browser', async () => {
  const [err, chrome] = await tryCatch(startChrome());
  await chrome.close();

  return expect(err).toEqual(null);
});

test('should use an existing chrome process', async () => {
  const [err, chrome] = await tryCatch(startChrome());
  const [err2, _] = await tryCatch(startChrome());

  await chrome.close();

  expect(err2).toEqual(null);
  return expect(err).toEqual(null);
});
