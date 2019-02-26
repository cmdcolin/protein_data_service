#!/usr/bin/env node
const url = require('url')
const fs = require('fs')
const express = require('express')
const fetch = require('cross-fetch')

// unused
// function fetchGeneInfo(entrezGene) {
//   return fetch(`http://mygene.info/v3/gene/${entrezGene}`)
//     .then(res => res.text())
//     .then(text => JSON.parse(text))
// }

function parseText(text, attributes) {
  const lines = text.split(/\s*\n\s*/).filter(line => /\S/.test(line))
  return lines.map(line => {
    const fields = line.split('\t')
    const data = {}
    attributes.forEach(a => {
      data[a] = fields.shift()
    })
    return data
  })
}
function fetchDomains(ensemblGeneId) {
  const attributes = [
    'ensembl_gene_id',
    'uniprotswissprot',
    'entrezgene',
    'refseq_mrna',
    'description',
    'chromosome_name',
    'start_position',
    'end_position',
    'external_gene_name',
    'ensembl_transcript_id',
    'family',
    'family_description',
    'interpro',
    'interpro_short_description',
    'interpro_description',
    'interpro_start',
    'interpro_end',
  ]

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "0" count = "" datasetConfigVersion = "0.6" >

	<Dataset name = "hsapiens_gene_ensembl" interface = "default" >
    <Filter name = "ensembl_gene_id" value = "${ensemblGeneId}"/>
  ${attributes.map(a => `<Attribute name = "${a}" />\n`)}
	</Dataset>
</Query>
`
  const bioMartQueryUrl = url.format({
    protocol: 'http',
    host: 'useast.ensembl.org',
    // host: 'localhost:2999',
    pathname: '/biomart/martservice',
    query: { query },
  })
  // console.log('query url is', bioMartQueryUrl)
  return fetch(bioMartQueryUrl)
    .then(r => r.text())
    .then(text => parseText(text, attributes))
}

function fetchVariants(ensemblGeneId) {
  const attributes = [
    'refsnp_id',
    'refsnp_source',
    'chr_name',
    'chrom_start',
    'chrom_end',
    'ensembl_gene_stable_id',
    'ensembl_transcript_stable_id',
    'ensembl_transcript_chrom_strand',
    'ensembl_type',
    'consequence_type_tv',
    'consequence_allele_string',
    'cdna_start',
    'cdna_end',
    'ensembl_peptide_allele',
    'translation_start',
    'translation_end',
    'cds_start',
    'cds_end',
    'distance_to_transcript',
    'polyphen_prediction',
    'polyphen_score',
    'sift_prediction',
    'sift_score',
  ]

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "0" count = "" datasetConfigVersion = "0.6" >

	<Dataset name = "hsapiens_snp_som" interface = "default" >
    <Filter name = "variation_source" value = "COSMIC"/>
    <Filter name = "ensembl_gene" value = "${ensemblGeneId}"/>
  ${attributes.map(a => `<Attribute name = "${a}" />\n`)}
	</Dataset>
</Query>
`
  const bioMartQueryUrl = url.format({
    protocol: 'http',
    host: 'useast.ensembl.org',
    // host: 'localhost:2999',
    pathname: '/biomart/martservice',
    query: { query },
  })
  // console.log('query url is', bioMartQueryUrl)
  return fetch(bioMartQueryUrl)
    .then(r => r.text())
    .then(text => parseText(text, attributes))
}
function startServer() {
  const app = express()
  const port = 2999

  app.get('/', async (req, res, next) => {
    try {
      const { ensemblGeneId } = req.query
      if (!ensemblGeneId) {
        throw new Error('no ensembl gene id specified')
      }
      const variantFetch = fetchVariants(ensemblGeneId)
      const domainFetch = fetchDomains(ensemblGeneId)
      Promise.all([variantFetch, domainFetch]).then(([variants, domains]) => {
        res.status(200).send({
          variants,
          domains,
        })
      })
    } catch (error) {
      next(error)
    }
  })
  app.listen(port, () => {
    console.log(
      `Demo data service listening on port ${port}. \n\nTry it out with\n     curl http://localhost:${port}/?geneId=ENSG00000000003`,
    )
  })
}

console.log('parsing frequencies')
const varFreqs = {}
fs.readFileSync('data/frequencies.txt', 'ascii')
  .split('\n')
  .forEach(line => {
    const [variantId, count] = line.split('\t')
    varFreqs[variantId] = +count
  })

startServer()
