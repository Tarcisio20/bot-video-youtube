const { google } = require('googleapis')
const gm = require('gm').subClass({ imageMagick : true })
const imageDownloader = require('image-downloader')
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    const content = state.load()

    await fetchImagesOfAllSenteces(content)
    await downloadAllImages(content)
   
    state.save(content)

    async function fetchImagesOfAllSenteces(content){
        for (const sentence of content.sentences){
            const query = `${content.searchTerm} ${sentence.keywords[0]}`
            sentence.images = await fetchGoogleAndReturnImageLinks(query)

            sentence.googleSearchQuery = query
        }
    }

    async function fetchGoogleAndReturnImageLinks(query){
        const response = await customSearch.cse.list({
            auth : googleSearchCredentials.apiKey,
            cx : googleSearchCredentials.searchEngineId,
            q : query,
            searchType : 'image',
          //  imageSize : 'huge',
            num : 2
        })
        const imagesUrl = response.data.items.map((item) => {
            return item.link
        })
        return imagesUrl
    }

    async function downloadAllImages(content){
        content.dowloadedImages = []



        for (let sentenceIndex =0; sentenceIndex < content.sentences.length; sentenceIndex++){
            const images = content.sentences[sentenceIndex].images

            for (let imageIndex = 0; imageIndex < images.length; imageIndex++){
                const imageUrl = images[imageIndex]

                try{
                    if(content.dowloadedImages.includes(imageUrl)){
                        throw new Error('Imagem já baixada!')
                    }
                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`)
                    content.dowloadedImages.push(imageUrl)
                    console.log(`> [${sentenceIndex}][${imageIndex}] Baixou imagem com sucesso: ${imageUrl}`)
                    break
                }catch(error){
                    console.log(`> [${sentenceIndex}][${imageIndex}] Erro ao baixar imagem: ${imageUrl}: ${error}`) 
                }
            }
        }
    }

    async function downloadAndSave(url, fileName){
        return imageDownloader.image({
            url, url,
            dest : `./content/${fileName}`
        })
    }

    
}

module.exports = robot