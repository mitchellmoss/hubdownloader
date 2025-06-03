const puppeteer = require('puppeteer');

async function testYouTubeDownload() {
  console.log('Starting test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Go to our app
  console.log('Navigating to app...');
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForSelector('input[type="url"]');
  
  // Enter YouTube URL
  console.log('Entering YouTube URL...');
  await page.type('input[type="url"]', 'https://www.youtube.com/watch?v=aj3uBl9hFxY');
  
  // Click extract button
  console.log('Clicking Extract button...');
  await page.click('button:has-text("Extract")');
  
  // Wait for results
  console.log('Waiting for results...');
  await page.waitForSelector('button:has-text("Download")', { timeout: 30000 });
  
  // Get video info
  const videos = await page.$$eval('button:has-text("Download")', buttons => buttons.length);
  console.log(`Found ${videos} videos`);
  
  // Click first download button
  console.log('Clicking download button...');
  await page.click('button:has-text("Download")');
  
  // Wait a bit to see the download progress
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('Test complete!');
  
  // Keep browser open for manual inspection
  // await browser.close();
}

testYouTubeDownload().catch(console.error);