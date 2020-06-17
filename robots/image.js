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
    await convertAllImages(content)
    await createAllSentencesImages(content)
    await createYouTubeThumbnail()

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

    async function convertAllImages(content){
        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            await converImage(sentenceIndex)
        }  
    }

    async function convertImage(sentenceIndex) {
        return new Promise((resolve, reject) => {
          const inputFile = fromRoot(`./content/${sentenceIndex}-original.png[0]`)
          const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`)
          const width = 1920
          const height = 1080
    
          gm()
            .in(inputFile)
            .out('(')
              .out('-clone')
              .out('0')
              .out('-background', 'white')
              .out('-blur', '0x9')
              .out('-resize', `${width}x${height}^`)
            .out(')')
            .out('(')
              .out('-clone')
              .out('0')
              .out('-background', 'white')
              .out('-resize', `${width}x${height}`)
            .out(')')
            .out('-delete', '0')
            .out('-gravity', 'center')
            .out('-compose', 'over')
            .out('-composite')
            .out('-extent', `${width}x${height}`)
            .write(outputFile, (error) => {
              if (error) {
                return reject(error)
              }
    
              console.log(`> [video-robot] Image converted: ${outputFile}`)
              resolve()
            })
    
        })
      }

    async function createAllSentencesImages(content){
        for (let sentencesIndex = 0; sentencesIndex < content.sentences.length; sentencesIndex++){
            await createSentenceImage(sentencesIndex, content.sentences[sentencesIndex].text)
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText) {
        return new Promise((resolve, reject) => {
          const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`)
    
          const templateSettings = {
            0: {
              size: '1920x400',
              gravity: 'center'
            },
            1: {
              size: '1920x1080',
              gravity: 'center'
            },
            2: {
              size: '800x1080',
              gravity: 'west'
            },
            3: {
              size: '1920x400',
              gravity: 'center'
            },
            4: {
              size: '1920x1080',
              gravity: 'center'
            },
            5: {
              size: '800x1080',
              gravity: 'west'
            },
            6: {
              size: '1920x400',
              gravity: 'center'
            }
    
          }
    
          gm()
            .out('-size', templateSettings[sentenceIndex].size)
            .out('-gravity', templateSettings[sentenceIndex].gravity)
            .out('-background', 'transparent')
            .out('-fill', 'white')
            .out('-kerning', '-1')
            .out(`caption:${sentenceText}`)
            .write(outputFile, (error) => {
              if (error) {
                return reject(error)
              }
    
              console.log(`> [video-robot] Sentence created: ${outputFile}`)
              resolve()
            })
        })
      }

      async function createYouTubeThumbnail() {
        return new Promise((resolve, reject) => {
          gm()
            .in(fromRoot('./content/0-converted.png'))
            .write(fromRoot('./content/youtube-thumbnail.jpg'), (error) => {
              if (error) {
                return reject(error)
              }
    
              console.log('> [video-robot] YouTube thumbnail created')
              resolve()
            })
        })
      }
}

module.exports = robot