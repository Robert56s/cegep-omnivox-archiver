// Import puppeteer
import puppeteer from 'puppeteer';
import './loadEnv.mjs';
import fs, { link } from 'fs'
import path from 'path'


//ordre -> i: cours, y: cat, z: content

async function main() {
    
    await fs.mkdir('output', (err) => {
        if (err) {
            console.error(`Error creating folder: ${err.message}`);
        } else {
            console.log(`Folder 'output' created successfully.`);
        }
    });
    // Launch the browser
    const browser = await puppeteer.launch({headless: "new"});

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
    let courses = await page.evaluate(() => 
        Array.from(document.querySelectorAll('#form2 > main > div.section-centre > div > div'), (e) => ({
            title: e.querySelector('.card-panel-title').innerText,
            desc: e.querySelector('.card-panel-desc').innerText,
            link: e.querySelector('div.card-panel-content > a:nth-child(2)').href,
            categories: []
        }))
    )

    for (let i = 0; i < courses.length; i++) {

        // //cree dossier
        // let courseFolderPath = await path.join('output', courses[i].title)
        // let alternativeCourseFolderPath = await path.join('output', String(i))

        // await fs.mkdir(courseFolderPath, { recursive: true }, (err) => {
        //     if (err) {
        //         // console.error(`Error creating folder: ${err.message}`);
        //         // console.log(`Folder will be called instead ${alternativeCourseFolderPath}`)
        //         fs.mkdir(alternativeCourseFolderPath, { recursive: true }, (err) => {
        //             if(err) throw err;
        //         })
        //     } else {
        //         // console.log(`Folder '${courseFolderPath}' created successfully.`);
        //     }
        // });

        // let descFolderPath = await path.join(courseFolderPath, 'desc.txt')
        // let alternativeDescFolderPath = await path.join(alternativeCourseFolderPath, 'desc.txt')

        // await fs.writeFile(descFolderPath,`${courses[i].title}\n${courses[i].desc}`, (err) => {
        //     if (err) {
        //         // console.error(`Error creating file: ${err.message}`);
        //         // console.log(`lets try with the folder ${alternativeDescFolderPath}`)

        //         async function repeat() {
        //             fs.writeFile(alternativeDescFolderPath,`${courses[i].title}\n${courses[i].desc}`, (err) => {
        //                 if(err) repeat();
        //             })
        //         }
        //         repeat()

        //     }
        // })

        await page.goto(courses[i].link)

        await page.waitForSelector('.CategorieDocument')
        await page.waitForSelector('td.DisDoc_TitreCategorie > a');
        await page.waitForSelector('a.lblTitreDocumentDansListe')
        
        courses[i].categories = await page.evaluate(()=>
        Array.from(document.querySelectorAll('.CategorieDocument'), (categoryElement) => ({
            title: categoryElement.querySelector('td.DisDoc_TitreCategorie').innerText.trim(),
            content: Array.from(categoryElement.querySelectorAll('.divDescriptionDocumentDansListe'), (itemElement) => ({
                title: itemElement.querySelector('a.lblTitreDocumentDansListe').innerText.trim(),
                link: itemElement.querySelector('a.lblTitreDocumentDansListe').href,
                desc: itemElement.lastElementChild.innerText.trim(),
                path: ""
            }))
          }))
        );
        
        let coursePath = await path.join('output', `${i+1}. ${courses[i].title}`)
        
        for (let y = 0; y < courses[i].categories.length; y++) {

            let catPath = await path.join(coursePath, `${y+1}. ${courses[i].categories[y].title}`)

            for(let z = 0; z < courses[i].categories[y].content.length; z++) {
                
                let contentPath = await path.join(catPath, `${z+1}. ${courses[i].categories[y].content[z].title}`)

                let cleanContentPath = await contentPath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")

                //ecrit rien d'autre la dedans pr sync
                await fs.mkdir(cleanContentPath, { recursive: true }, (err) => {
                    if(err) throw err;
                })           
                

                let link = courses[i].categories[y].content[z].link

                
                

                try {
                    const client = await page.target().createCDPSession()

                    await client.send('Page.setDownloadBehavior', {
                        behavior: 'allow',
                        downloadPath: cleanContentPath,
                    })

                    await page.goto(link)
                    await page.evaluate(()=> 
                        document.querySelector("#download").click()
                    )
                    console.log(`${i}.${y}.${z} -> pdf downloaded`)
                    await page.goBack()

                } catch (error){
                    console.log(`${i}.${y}.${z} -> err?`)
                    console.log(error)
                }
            }
        }
        //create desc.txt
        let cleanCoursePath = await coursePath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")
        let cleanCourseDesc = await path.join(cleanCoursePath, 'desc.txt')
        
        fs.mkdir(cleanCoursePath, { recursive: true }, (err) => {
            if (err) throw err;

            fs.writeFile(cleanCourseDesc, `${courses[i].title}\n${courses[i].desc}`, (err) => {
                if (err) throw err;
            })
        })
        
        await page.goBack()
    }
    
    // console.log(courses[1])
    // console.log(courses[1].categories[0])
    
    let jsonPath = await path.join('output', 'courses.json')
    
    fs.writeFile(jsonPath, JSON.stringify(courses), (err) => {
        if (err) throw err;
    })

    await browser.close()
    
    console.log('done')
}

function isLink(str) {
    // Regular expression for a simple URL pattern
    var urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  
    // Test the string against the regular expression
    return urlPattern.test(str);
}

main();