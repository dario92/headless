headless - NodeJS API for Headless Chrome
========

## 😎 Easy to use
```js
import startChrome from 'headless';

(async function() {
  const chrome = await startChrome();
  const tab = await chrome.createTab();
  await tab.setDevice('iPhone6Plus');
  await tab.navigate('https://news.ycombinator.com/');

  await tab.capture('./test.png', { clip: '.itemlist > tbody' });
  console.log('saved');

  await tab.close();
  await chrome.close();
}());
```

## 🖥  Installation

### macOS
Install Chrome 59+ or the latests version of Chrome Canary.

* Chrome 59+ (not out yet)
* Chrome Canary ([download](https://www.google.com/chrome/browser/canary.html))

Then install headless as a dependency using

```bash
$ npm install headless --save
```

### Linux
Install Google Chrome ([https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line
](https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line
))

```bash
$ sudo apt-get install libxss1 libappindicator1 libindicator7
$ wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
$ sudo dpkg -i google-chrome*.deb  # Might show "errors", fixed by next line
$ sudo apt-get install -f
```
Then install headless as a dependency using

```bash
$ npm install headless --save
```

### Windows
coming soon :(

### API docs
coming soon

## Tests
Coming soon
