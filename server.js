#!/usr/bin/env node
const url = require('url')
const fs = require('fs')
const cors = require('cors')
const express = require('express')
const fetch = require('cross-fetch')
const zlib = require('zlib')

const varFreqs = {}

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
    Object.keys(attributes).forEach(a => {
      const ret = fields.shift()
      data[a] = attributes[a] == 'int' ? +ret : ret
    })
    return data
  })
}

function fetchSequences(ensemblGeneId) {
  const ensemblApiQueryUrl = url.format({
    protocol: 'http',
    host: 'rest.ensembl.org',
    pathname: `/sequence/id/${ensemblGeneId}`,
    query: {
      'content-type': 'application/json',
      type: 'protein',
      multiple_sequences: 1,
    },
  })
  return fetch(ensemblApiQueryUrl)
    .then(r => r.json())
}

function fetchDomains(ensemblGeneId, ensemblTranscriptId) {
  const attributes = {
    'ensembl_gene_id':'string',
    'ensembl_transcript_id':'string',
    'ensembl_peptide_id':'string',
    'transcript_biotype':'string',
    'uniprotswissprot':'string',
    'entrezgene':'string',
    'refseq_mrna':'string',
    'description':'string',
    'chromosome_name':'string',
    'start_position':'int',
    'end_position':'int',
    'external_gene_name':'string',
    'family':'string',
    'family_description':'string',
    'interpro':'string',
    'interpro_short_description':'string',
    'interpro_description':'string',
    'interpro_start':'int',
    'interpro_end':'int',
  }

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "0" count = "" datasetConfigVersion = "0.6" >

	<Dataset name = "hsapiens_gene_ensembl" interface = "default" >
    <Filter name = "ensembl_gene_id" value = "${ensemblGeneId}"/>
  ${Object.keys(attributes).map(a => `<Attribute name = "${a}" />\n`)}
	</Dataset>
</Query>
`
  const bioMartQueryUrl = url.format({
    protocol: 'http',
    host: 'useast.ensembl.org',
    pathname: '/biomart/martservice',
    query: { query },
  })
  return fetch(bioMartQueryUrl)
    .then(r => r.text())
    .then(text => parseText(text, attributes))
    .then(domains =>
      domains.filter(
        d =>
          !ensemblTranscriptId ||
          d.ensembl_transcript_id === ensemblTranscriptId,
      ),
    )
}

function fetchVariants(ensemblGeneId, ensemblTranscriptId) {
  const attributes = {
    'refsnp_id':'string',
    'refsnp_source':'string',
    'chr_name':'string',
    'chrom_start':'int',
    'chrom_end':'int',
    'ensembl_gene_stable_id':'string',
    'ensembl_transcript_stable_id':'string',
    'ensembl_transcript_chrom_strand':'int',
    'ensembl_type':'string',
    'consequence_type_tv':'string',
    'consequence_allele_string':'string',
    'cdna_start':'int',
    'cdna_end':'int',
    'ensembl_peptide_allele':'string',
    'translation_start':'int',
    'translation_end':'int',
    'cds_start':'int',
    'cds_end':'int',
    'distance_to_transcript':'int',
    'polyphen_prediction':'string',
    'polyphen_score':'int',
    'sift_prediction':'string',
    'sift_score':'int',
  }

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "0" count = "" datasetConfigVersion = "0.6" >

	<Dataset name = "hsapiens_snp_som" interface = "default" >
    <Filter name = "variation_source" value = "COSMIC"/>
    <Filter name = "ensembl_gene" value = "${ensemblGeneId}"/>
  ${Object.keys(attributes).map(a => `<Attribute name = "${a}" />\n`)}
	</Dataset>
</Query>
`
  const bioMartQueryUrl = url.format({
    protocol: 'http',
    host: 'useast.ensembl.org',
    pathname: '/biomart/martservice',
    query: { query },
  })
  return fetch(bioMartQueryUrl)
    .then(r => r.text())
    .then(text => parseText(text, attributes))
    .then(variants => {
      return variants.map(v => {
        return Object.assign(v, { count: varFreqs[v.refsnp_id] })
      })
    })
    .then(variants =>
      variants.filter(
        v =>
          !ensemblTranscriptId ||
          v.ensembl_transcript_stable_id === ensemblTranscriptId,
      ),
    )
}
function startServer() {
  const app = express()
  const port = 2999
  app.use(cors())

  app.get('/', async (req, res, next) => {
    try {
      const { ensemblGeneId, ensemblTranscriptId } = req.query
      if (!ensemblGeneId) {
        throw new Error('no ensemblGeneId specified')
      }
      const variantFetch = fetchVariants(ensemblGeneId, ensemblTranscriptId)
      const domainFetch = fetchDomains(ensemblGeneId, ensemblTranscriptId)
      const sequenceFetch = fetchSequences(ensemblGeneId)
      const [variants, domains, sequences] = await Promise.all([variantFetch, domainFetch, sequenceFetch])
      const t1 = [...new Set(variants.map(v => v.ensembl_transcript_stable_id))];
      const t2 = [...new Set(domains.map(v => v.ensembl_transcript_id))];
      console.log(t1)
      console.log(t2)
      res.status(200).send({
        variants,
        domains,
        sequences
      })
    } catch (error) {
      next(error)
    }
  })
  app.listen(port, () => {
    console.log(
      `Demo data service listening on port ${port}. \n\nTry it out with\n     curl http://localhost:${port}/?ensemblGeneId=ENSG00000000003`,
    )
  })
}

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
startServer()
