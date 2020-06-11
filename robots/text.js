const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const watsonApiKey = require('../credentials/watson-nlu.json')
const sentenceBoudaryDetection = require('sbd')

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1')
const { IamAuthenticator } = require('ibm-watson/auth')
var nlu = new  NaturalLanguageUnderstandingV1({
    authenticator: new IamAuthenticator({ apikey: watsonApiKey.apikey }),
    version: '2018-04-05',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

async function robot(content){
    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentInToSentences(content)
    limitMaximumSentences(content)
    await fetchKeywordsOfAllSentences(content)


   async function fetchContentFromWikipedia(content){
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
    const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
    const wiKipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm)
    const wikipediaContent = wiKipediaResponse.get()
    
    content.sourceContentOriginal = wikipediaContent.content
   }

   function sanitizeContent(content){
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)
        content.sourceContentSanitized = withDatesInParentheses

        function removeBlankLinesAndMarkdown(text){
            const allLines = text.split('\n')

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if(line.trim().length === 0 || line.trim().startsWith('=')){
                    return false
                }
                return true
            })
            return withoutBlankLinesAndMarkdown.join('')  
        }
   }

   function removeDatesInParentheses(text){
        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ') 
   }

   function breakContentInToSentences(content){
       content.sentences = []
       const sentences = sentenceBoudaryDetection.sentences(content.sourceContentSanitized)
       sentences.forEach((sentence)=>{
           content.sentences.push({
               text: sentence,
               keywords: [],
               images: []
           })
       })
   }

   function limitMaximumSentences(content){
        content.sentences = content.sentences.slice(0, content.maximumSentences)
   }

   async function fetchKeywordsOfAllSentences(content) {
    console.log('> [text-robot] Starting to fetch keywords from Watson')

    for (const sentence of content.sentences) {
      console.log(`> [text-robot] Sentence: "${sentence.text}"`)

      sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)

      console.log(`> [text-robot] Keywords: ${sentence.keywords.join(', ')}\n`)
    }
  }


  // async function fetchKeywordsOfAllSentences(content){
      //  console.log(content.sentences)
        //for(i = 0; i > content.sentences.text.length; i++){
          //  console.log(i)
        //}
       
       /*let i = 0
       for( const sentence of content.sentences ){
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence[i].text)
            console.log(content.sentences.text)
            i++
       }*/
  // }

/*
  async function fetchWatsonAndReturnKeywords(sentence){
        nlu.analyze({
            text: sentence,
            features: {
                keywords: {}
            }
        }).then(response => {
            
            const keywords = response.keywords.map((keyword)=>{
                return keyword.text
            })
            return keywords
        }).catch(error =>{
            throw error
        })
    }
    */
   async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {
      nlu.analyze({
        text: sentence,
        features: {
          keywords: {}
        }
      }, (error, response) => {
        if (error) {
          reject(error)
          return
        }

        const keywords = response.result.keywords.map((keyword) => {
          return keyword.text
        })
        console.log(keywords)
        resolve(keywords)
      })
    })
  }
}

module.exports = robot