// Import puppeteer
import puppeteer from 'puppeteer';
import './loadEnv.mjs';
import fs, { link } from 'fs'
import path from 'path'
import puppeteerExtra from 'puppeteer-extra';
import userPrefs from 'puppeteer-extra-plugin-user-preferences';


//ordre -> i: cours, y: cat, z: content

async function main() {

    puppeteerExtra.use(
        userPrefs({
            userPrefs: {
                download: {
                    prompt_for_download: false,
                    open_pdf_in_system_reader: true,
                },
                plugins: {
                    always_open_pdf_externally: true,
                },
            },
        })
    );
    
    await fs.mkdir('output', (err) => {
        if (err) {
            console.error(`Error creating folder: ${err.message}`);
        } else {
            console.log(`Folder 'output' created successfully.`);
        }
    });
    // Launch the browser
    const browser = await puppeteerExtra.launch({headless: false});

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
            content: Array.from(categoryElement.querySelectorAll('.itemDataGrid'), (itemElement) => ({
                title: itemElement.querySelector('a.lblTitreDocumentDansListe').innerText.trim(),
                link: itemElement.querySelector('td.lblDescriptionDocumentDansListe > div.divDescriptionDocumentDansListe > a.lblTitreDocumentDansListe').href,
                imgSrc: itemElement.querySelector('td.colVoirTelecharger > a > img').src,
                type: "",
                desc: itemElement.lastElementChild.innerText.trim(),
                path: ""
            }))
          }))
        );
        
        let coursePath = await path.join('output', `${i+1}. ${courses[i].title}`)
        
        for (let y = 0; y < courses[i].categories.length; y++) {

            let catPath = await path.join(coursePath, `${y+1}. ${courses[i].categories[y].title}`)

            for(let z = 0; z < courses[i].categories[y].content.length; z++) {

                let lastSegment = (courses[i].categories[y].content[z].imgSrc).split('/').pop()

                if (lastSegment == "FicPDF.gif") {
                    courses[i].categories[y].content[z].type = "pdf"
                } else if (lastSegment == "FicDOC.gif") {
                    courses[i].categories[y].content[z].type = "doc"
                } else if (lastSegment == "FicPPT.gif") {
                    courses[i].categories[y].content[z].type = "ppt"
                } else if (lastSegment == "FicXLS.gif") {
                    courses[i].categories[y].content[z].type = "xls"
                } else if (lastSegment == "lienExterne_petit.png") {
                    courses[i].categories[y].content[z].type = "link"
                } else  if (lastSegment == "youtube_petit.png") { 
                    courses[i].categories[y].content[z].type = "youtube"
                } else if (lastSegment == "FicJPG.gif") {
                    courses[i].categories[y].content[z].type = "jpg"
                } else if (lastSegment == "FicMP3.gif") {
                    courses[i].categories[y].content[z].type = "mp3"
                } else if (lastSegment == "FicMP4.gif") {
                    courses[i].categories[y].content[z].type = "mp4"
                } else if (lastSegment == "FicTXT.gif") { 
                    courses[i].categories[y].content[z].type = "txt"
                } else if (lastSegment == "FicAuttre.gif") {
                    courses[i].categories[y].content[z].type = "other"
                } else {
                    courses[i].categories[y].content[z].type = "other"
                }
                
                let contentPath = await path.join(catPath, `${z+1}. ${courses[i].categories[y].content[z].title} (${courses[i].categories[y].content[z].type})`)

                let cleanContentPath = await contentPath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")

                let cleanContentLinkPath = await path.join(contentPath, 'link.txt')
                let cleanContentHtmlPath = await path.join(contentPath, 'text.hmtl')

                //ecrit rien d'autre la dedans pr sync
                await fs.mkdir(cleanContentPath, { recursive: true }, (err) => {
                    if(err) throw err;
                })           
                

                let link = courses[i].categories[y].content[z].link
                
                let downloadPath = path.resolve(cleanContentPath)

                await page._client().send('Page.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: downloadPath,
                })


                await page.waitForTimeout(1000)

                // if(courses[i].categories[y].content[z].)

                try {
                    await goto(page, link)
                    
                    if(courses[i].categories[y].content[z].type == "link" || courses[i].categories[y].content[z].type == "youtube" || courses[i].categories[y].content[z].type == "jpg") {

                        const pages = await browser.pages();
                        const popup = pages[pages.length - 1];
                        const url = await popup.url();

                        fs.writeFile(cleanContentLinkPath, `${url}`, (err) => {
                            if (err) throw err;
                        })
                    }
                    if (courses[i].categories[y].content[z].type == "text") {
                        const pages = await browser.pages();
                        const popup = pages[pages.length - 1];
                        let htmlContent = await popup.content();
                        fs.writeFile(cleanContentHtmlPath, `${htmlContent}`, (err) => {
                            if (err) throw err;
                        })
                    }

                    console.log(`${i}.${y}.${z} -> ${courses[i].categories[y].content[z].type} downloaded`)
                    await page.waitForTimeout(3000)
                    // await page.goBack()
                    
                } catch (error){   
                    // console.log(error)
                    console.log(`${i}.${y}.${z} -> err?`)
                    
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

    await page.waitForTimeout(3000);
    await browser.close()
    
    console.log('done')
}


async function goto(page, link) {
    return page.evaluate((link) => {
        location.href = link;
    }, link);
}


main();