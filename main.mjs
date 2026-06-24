// Import puppeteer
import puppeteer from 'puppeteer';
import './loadEnv.mjs';
import fs, { link } from 'fs'
import path from 'path'
import puppeteerExtra from 'puppeteer-extra';
import userPrefs from 'puppeteer-extra-plugin-user-preferences';
import { setTimeout } from "node:timers/promises";


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
    page.setDefaultNavigationTimeout(60000); // Increase navigation timeout to 60 seconds

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
            linkT: e.querySelector('div.card-panel-content > a:nth-child(3)').href,
            nT: e.querySelector('div.card-panel-content > a:nth-child(3) > div > div.card-panel-item-content > div > div.right-section > span > span').innerText.trim(),
            categories: []
        }))
    )
    

    for (let i = 2; i < courses.length; i++) {

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


                await setTimeout(3000)

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
                    await setTimeout(3000)
                    // await page.goBack()
                    
                } catch (error){   
                    // console.log(error)
                    console.log(`${i}.${y}.${z} -> err?`)
                    
                }

            }
        }
        console.log(courses[i].nT, courses[i].linkT)
        await page.goBack()
        await page.goto(courses[i].linkT)
        
        if (courses[i].nT != "0") {
            await page.waitForSelector('#tabListeTravEtu > tbody > tr')
            courses[i].travaux = await page.evaluate(()=>
                Array.from(document.querySelectorAll('#tabListeTravEtu > tbody > tr'))
                    .filter(travauxElement => travauxElement.querySelector('td:nth-child(2) > a') && travauxElement.querySelector('td:nth-child(3) > span:nth-child(1)'))
                    .map(travauxElement => ({
                        title: travauxElement.querySelector('td:nth-child(2) > a').innerText.trim(),
                        date: travauxElement.querySelector('td:nth-child(3) > span:nth-child(1)').innerText.trim(),
                        link: `https://cvm-lea.omnivox.ca/cvir/dtrv/${travauxElement.querySelector('td:nth-child(2) > a').onclick.toString().match(/OpenCentre\('([^']+)'/)[1]}`,
                    }))
            );

            let tPath = await path.join(coursePath, 'travaux')

            for (let a = 0; a < courses[i].travaux.length; a++) {
                console.log(courses[i].travaux[a])
                await page.goto(courses[i].travaux[a].link)
                await setTimeout(3000)

                courses[i].travaux[a].nomDocLie = await page.evaluate(() => document.querySelector('#lblDocumentLie').innerText.trim())
                courses[i].travaux[a].linkDocLie = await page.evaluate(() => document.querySelector('#ALienFichierLie2').href)

                let tDocLiePath = await path.join(tPath, `${a+1}. ${courses[i].travaux[a].title}`)
                let travauxDocLiePath = await path.join(tDocLiePath, 'docLie')
                let cleanTravauxPath = await travauxDocLiePath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")

                let downloadPath = path.resolve(cleanTravauxPath)

                await page._client().send('Page.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: downloadPath,
                })

                await setTimeout(3000)

                try {
                    await goto(page, courses[i].travaux[a].linkDocLie)

                    console.log(`Travaux Doc Lie ${i}.${a} -> ${courses[i].travaux[a].title} downloaded`)
                    await setTimeout(3000)
                    // await page.goBack()
                    
                } catch (error){   
                    // console.log(error)
                    console.log(`${i}.${y}.${z} -> err?`)
                    
                }

                courses[i].travaux[a].docRemis = await page.evaluate(() => 
                    Array.from(document.querySelectorAll('#formUpload > div.container > ul > li:nth-child(2) > div:nth-child(3) > div:nth-child(2) > a'), (docRemisElement) => ({
                        link: docRemisElement.href,
                        title: docRemisElement.innerText.trim(),
                    }))
                );
                
                courses[i].travaux[a].docRemis = courses[i].travaux[a].docRemis.filter(doc => doc.title !== "");


                for (let b = 0; b < courses[i].travaux[a].docRemis.length; b++) {
                    let travauxDocRemisPath = await path.join(tDocLiePath, `docRemis_${b+1}`)
                    let cleanTravauxDocRemisPath = await travauxDocRemisPath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")

                    await page._client().send('Page.setDownloadBehavior', {
                        behavior: 'allow',
                        downloadPath: path.resolve(cleanTravauxDocRemisPath),
                    })

                    await setTimeout(3000)

                    try {
                        await goto(page, courses[i].travaux[a].docRemis[b].link)

                        console.log(`Travaux Doc Remis ${i}.${a}.${b} -> ${courses[i].travaux[a].title} downloaded`)
                        await setTimeout(3000)
                        
                    } catch (error){   
                        // console.log(error)
                        console.log(`${i}.${y}.${z} -> err?`)
                        
                    }
                }
                await page.goBack()

                //create info.txt
                let infoPath = await path.join(tDocLiePath, 'info.txt');
                fs.mkdir(path.dirname(infoPath), { recursive: true }, (err) => {
                    if (err) throw err;
                    fs.writeFile(infoPath, `Date: ${courses[i].travaux[a].date}`, (err) => {
                        if (err) throw err;
                    });
                });
            }
        }


        await page.goBack()

        
        //create desc.txt
        let cleanCoursePath = await coursePath.replace(/[<>:"|?*]/g, '_').trim().replace(/\.$/, "")
        let cleanCourseDesc = await path.join(cleanCoursePath, 'desc.txt')
        
        fs.mkdir(cleanCoursePath, { recursive: true }, (err) => {
            if (err) throw err;

            fs.writeFile(cleanCourseDesc, `${courses[i].title}\n${courses[i].desc}`, (err) => {
                if (err) throw err;
            })
        })
        
    }
    
    // console.log(courses[1])
    // console.log(courses[1].categories[0])
    
    let jsonPath = await path.join('output', 'courses.json')
    
    fs.writeFile(jsonPath, JSON.stringify(courses), (err) => {
        if (err) throw err;
    })

    await setTimeout(3000);
    await browser.close()
    
    console.log('done')
}


async function goto(page, link) {
    return page.evaluate((link) => {
        location.href = link;
    }, link);
}


main();