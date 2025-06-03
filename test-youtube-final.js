const puppeteer = require('puppeteer');

async function testYouTubeDownload() {
  console.log('Starting YouTube download test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  page.on('response', response => {
    if (response.url().includes('api/')) {
      console.log('API Response:', response.url(), response.status());
    }
  });
  
  try {
    // Go to our app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Take initial screenshot
    await page.screenshot({ path: 'step1-loaded.png' });
    
    // Enter YouTube URL
    console.log('2. Entering YouTube URL...');
    const input = await page.$('input[type="url"]');
    await input.type('https://www.youtube.com/watch?v=aj3uBl9hFxY');
    
    // Take screenshot after typing
    await page.screenshot({ path: 'step2-url-entered.png' });
    
    // Click extract button
    console.log('3. Clicking Extract button...');
    await page.click('button:has-text("Extract")');
    
    // Wait a bit for the request to start
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step3-extracting.png' });
    
    // Wait for results with longer timeout
    console.log('4. Waiting for results...');
    try {
      await page.waitForSelector('button:has-text("Download")', { timeout: 45000 });
      console.log('✅ Videos found!');
      await page.screenshot({ path: 'step4-videos-found.png' });
      
      // Click download
      console.log('5. Clicking Download button...');
      await page.click('button:has-text("Download")');
      
      // Wait for download to process
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'step5-downloading.png' });
      
      // Check for errors
      const errorElement = await page.$('.text-red-600');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        console.log('❌ Error found:', errorText);
      } else {
        console.log('✅ No errors detected!');
      }
      
    } catch (error) {
      console.log('❌ Failed to find videos');
      await page.screenshot({ path: 'error-no-videos.png' });
      
      // Check for error message
      const errorElement = await page.$('.text-red-600');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        console.log('Error message:', errorText);
      }
    }
    
    console.log('Test complete! Check the screenshots.');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  }
  
  console.log('Browser will remain open. Close manually when done.');
}

testYouTubeDownload().catch(console.error);