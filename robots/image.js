const { google } = require('googleapis')
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot() {
    const content = state.load()

    await fetchImagesOfAllSenteces(content)
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
}

module.exports = robot