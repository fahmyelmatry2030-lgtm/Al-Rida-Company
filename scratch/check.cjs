const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const chromePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
  const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    await page.goto('http://localhost:5174/');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log('Error navigating:', e.message);
  } finally {
    await browser.close();
  }
})();
