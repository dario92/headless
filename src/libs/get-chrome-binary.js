import { sync as whichSync } from 'which';

const CHROME_PATHS = [
  'google-chrome-unstable',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
];

export default () => {
  const availableBinary = CHROME_PATHS.filter((binary) => {
    try {
      return whichSync(binary) === binary;
    } catch (e) {
      return false;
    }
  });

  return availableBinary[0];
};
