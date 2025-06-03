// Manual test script to try YouTube download
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Open browser and manually test the YouTube download flow');
  console.log('1. Go to http://localhost:3000');
  console.log('2. Enter YouTube URL: https://www.youtube.com/watch?v=aj3uBl9hFxY');
  console.log('3. Click Extract');
  console.log('4. Try to download a video');
  console.log('');
  console.log('Browser will stay open for manual testing...');
  
  await page.goto('http://localhost:3000');
})();