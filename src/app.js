#!/usr/bin/env node
const url = require('url')
const fs = require('fs')
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
    attributes.forEach(a => {
      data[a] = fields.shift()
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
  const attributes = [
    'ensembl_gene_id',
    'ensembl_transcript_id',
    'ensembl_peptide_id',
    'transcript_biotype',
    'uniprotswissprot',
    'entrezgene',
    'refseq_mrna',
    'description',
    'chromosome_name',
    'start_position',
    'end_position',
    'external_gene_name',
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


const app = express()

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
    res.status(200).send({
      variants,
      domains,
      sequences
    })
  } catch (error) {
    next(error)
  }
})


module.exports = app
