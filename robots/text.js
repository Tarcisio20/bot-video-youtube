const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoudaryDetection = require('sbd')

async function robot(content){
    await fetchContentFromWikipedia(content)
    sanitizeContent(content)
    breakContentInToSentences(content)


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
}

module.exports = robot