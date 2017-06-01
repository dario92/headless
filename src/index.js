import Chrome from './chrome';

export default async function startChrome(config) {
  const chrome = new Chrome(config);
  await chrome.startup();
  return chrome;
}
