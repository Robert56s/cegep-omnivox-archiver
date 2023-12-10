// Import puppeteer
import puppeteer from 'puppeteer';
import './loadEnv.mjs';



(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({headless: false});

    // Create a page
    const page = await browser.newPage();

    // Go to your site
    await page.goto('https://cvm.omnivox.ca/');

    // Query for an element handle.
    await page.locator('input#Identifiant').fill(process.env.NAME);
    await page.locator('input#Password').fill(process.env.PASSWORD);

    await page.locator('button.btn.green.darken-3.right.recaptcha-trigger.no-margin-right').click();

    await page.locator("a.raccourci.id-service_CVIE.code-groupe_lea").click()

})();