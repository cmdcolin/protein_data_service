const app = require('./app.js')
const port = 2999

console.log('parsing variant frequencies before app startup, please wait...')
const filename = 'data/frequencies.txt.gz'
zlib
  .gunzipSync(fs.readFileSync(filename))
  .toString()
  .split('\n')
  .forEach(line => {
    const [variantId, count] = line.split('\t')
    varFreqs[variantId] = +count
  })
console.log('done')


app.listen(port, () => {
  console.log(
    `Demo data service listening on port ${port}. \n\nTry it out with\n     curl http://localhost:${port}/?ensemblGeneId=ENSG00000000003`,
  )
})
