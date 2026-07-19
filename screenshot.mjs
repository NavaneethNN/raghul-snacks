import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/login');
await page.screenshot({ path: './login-page.png', fullPage: true });
console.log('Login page screenshot saved');

await page.goto('http://localhost:3000/signup');
await page.screenshot({ path: './signup-page.png', fullPage: true });
console.log('Signup page screenshot saved');

await browser.close();
