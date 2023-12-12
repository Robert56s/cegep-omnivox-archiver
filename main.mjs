// Import puppeteer
import puppeteer from 'puppeteer';
import './loadEnv.mjs';
import fs from 'fs'
import path from 'path'


(async () => {
    
    await fs.mkdir('output', (err) => {
        if (err) {
          console.error(`Error creating folder: ${err.message}`);
        } else {
          console.log(`Folder 'output' created successfully.`);
        }
    });
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


    await page.waitForSelector('#form2 > main > div.section-centre > div > div')
    await page.waitForSelector('div.card-panel-title');
    await page.waitForSelector('div.card-panel-desc')

    //faut pas faire () => {} mais juste () =>
    const courses = await page.evaluate(() => 
        Array.from(document.querySelectorAll('#form2 > main > div.section-centre > div > div'), (e) => ({
            title: e.querySelector('.card-panel-title').innerText,
            desc: e.querySelector('.card-panel-desc').innerText,
            link: e.querySelector('div.card-panel-content > a:nth-child(2)').href,
        }))
    )

    for (let i = 0; i < courses.length; i++) {

        //cree dossier
        let courseFolderPath = await path.join('output', courses[i].title)

        await fs.mkdir(courseFolderPath, { recursive: true }, (err) => {
            if (err) {
                console.error(`Error creating folder: ${err.message}`);
            } else {
                console.log(`Folder '${courseFolderPath}' created successfully.`);
            }
        });

        await page.goto(courses[i].link)

        await page.waitForSelector('.CategorieDocument')
        await page.waitForSelector('td.DisDoc_TitreCategorie > a');
        await page.waitForSelector('a.lblTitreDocumentDansListe')
        
        const categories = await page.evaluate(()=>
            Array.from(document.querySelectorAll('.CategorieDocument'), (e) => ({
                title: e.querySelector('td.DisDoc_TitreCategorie').innerText,
                links: Array.from(e.querySelectorAll('a.lblTitreDocumentDansListe')).map(link => link.href) 
            }))
        )

        for (let y = 0; y < categories.length; y++) {

            //cree dossier
            let categoriesFolderPath = await path.join(courseFolderPath, categories[y].title)

            await fs.mkdir(categoriesFolderPath, { recursive: true }, (err) => {
                if (err) {
                    console.error(`Error creating folder: ${err.message}`);
                } else {
                    console.log(`Folder '${categoriesFolderPath}' created successfully.`);
                }
            });
            console.log(`downloading everything from ${categories[y].title}`)

        }

        await page.goBack()
    }


    await browser.close()

})();