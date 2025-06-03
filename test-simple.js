const puppeteer = require('puppeteer');

async function testSimple() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Going to localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'page-screenshot.png' });
  
  console.log('Page title:', await page.title());
  
  // Check if the input exists
  const inputExists = await page.$('input') !== null;
  console.log('Input exists:', inputExists);
  
  // Get all inputs on page
  const inputs = await page.$$eval('input', els => els.map(el => ({ type: el.type, placeholder: el.placeholder })));
  console.log('Inputs found:', inputs);
  
  console.log('Browser will stay open for inspection.');
}

testSimple().catch(console.error);