const puppeteer = require('puppeteer');

async function testYouTubeDownloadFlow() {
  console.log('Starting YouTube download flow test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
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
    
    console.log('Videos found! Attempting download...');
    
    // Click first download button
    await page.click('button:has-text("Download")');
    
    // Wait for download to start
    console.log('Download initiated, waiting for progress...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check for any error messages
    const errorElement = await page.$('.text-red-600');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      console.log('Error found:', errorText);
    } else {
      console.log('No errors detected!');
    }
    
    console.log('Test complete!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Keep browser open for inspection
    console.log('Browser will remain open for inspection. Close manually when done.');
  }
}

testYouTubeDownloadFlow().catch(console.error);