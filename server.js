#!/usr/bin/env node
const url = require('url')
const fs = require('fs')
const cors = require('cors')
const express = require('express')
const fetch = require('cross-fetch')
const sqlite = require('sqlite')

const dbPromise = sqlite.open('./variants.db', { Promise });

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
      data[a] = attributes[a] === 'int' ? +ret : ret
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
  return fetch(ensemblApiQueryUrl).then(r => r.json())
}

function fetchCds(ensemblGeneId) {
  const ensemblApiQueryUrl = url.format({
    protocol: 'http',
    host: 'rest.ensembl.org',
    pathname: `/sequence/id/${ensemblGeneId}`,
    query: {
      'content-type': 'application/json',
      type: 'cds',
      multiple_sequences: 1,
    },
  })
  return fetch(ensemblApiQueryUrl).then(r => r.json())
}


function fetchDomains(ensemblGeneId, ensemblTranscriptId) {
  const attributes = {
    ensembl_gene_id: 'string',
    ensembl_transcript_id: 'string',
    ensembl_peptide_id: 'string',
    transcript_biotype: 'string',
    uniprotswissprot: 'string',
    entrezgene: 'string',
    refseq_mrna: 'string',
    description: 'string',
    chromosome_name: 'string',
    start_position: 'int',
    end_position: 'int',
    external_gene_name: 'string',
    family: 'string',
    family_description: 'string',
    interpro: 'string',
    interpro_short_description: 'string',
    interpro_description: 'string',
    interpro_start: 'int',
    interpro_end: 'int',
  }

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "0" count = "" datasetConfigVersion = "0.6" >

	<Dataset name = "hsapiens_gene_ensembl" interface = "default" >
    <Filter name = "ensembl_gene_id" value = "${ensemblGeneId}"/>
    <Filter name = "transcript_biotype" value = "protein_coding"/>
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

async function fetchVariants(ensemblGeneId, ensemblTranscriptId) {
  const attributes = {
    refsnp_id: 'string',
    refsnp_source: 'string',
    chr_name: 'string',
    chrom_start: 'int',
    chrom_end: 'int',
    ensembl_gene_stable_id: 'string',
    ensembl_transcript_stable_id: 'string',
    ensembl_transcript_chrom_strand: 'int',
    ensembl_type: 'string',
    consequence_type_tv: 'string',
    consequence_allele_string: 'string',
    cdna_start: 'int',
    cdna_end: 'int',
    ensembl_peptide_allele: 'string',
    translation_start: 'int',
    translation_end: 'int',
    cds_start: 'int',
    cds_end: 'int',
    distance_to_transcript: 'int',
    polyphen_prediction: 'string',
    polyphen_score: 'int',
    sift_prediction: 'string',
    sift_score: 'int',
  }

  const query = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE Query>
<Query  virtualSchemaName = "default" formatter = "TSV" header = "0" uniqueRows = "1" count = "" datasetConfigVersion = "0.6" >

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
    .then(async (variants) => {
      const sel = [...new Set(variants.map(v => v.refsnp_id))]
      const db = await dbPromise
      const q = `select * from variants where variant_id in (${sel.map(_ => "'"+_+"'")})`
      const map = {}
      const ret = await db.all(q)
      ret.forEach(row => {
        map[row.variant_id] = row.count
      })
      variants.forEach(variant => {
        variant.count = map[variant.refsnp_id]
      })
      return variants
    })
    .then(variants =>
      variants.filter(
        v =>
          !ensemblTranscriptId ||
          v.ensembl_transcript_stable_id === ensemblTranscriptId,
      ),
    ).then(variants =>
      variants.filter(
        v => v.translation_start<=v.translation_end
      )
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
      const cdsFetch = fetchCds(ensemblGeneId)
      const [variants, domains, sequences, cds] = await Promise.all([
        variantFetch,
        domainFetch,
        sequenceFetch,
        cdsFetch
      ])

      const transcriptsFromDomains = [
        ...new Set(domains.map(v => v.ensembl_transcript_id)),
      ]
      const transcriptMap = {}

      transcriptsFromDomains.forEach(t => {
        domains.forEach(d => {
          if (d.ensembl_transcript_id === t) {
            if (!transcriptMap[t]) {
              transcriptMap[t] = { variants: [], domains: [] }
            }
            transcriptMap[t].domains.push(d)
            transcriptMap[t].protein_id = d.ensembl_peptide_id
            transcriptMap[t].name = d.external_gene_name
          }
        })
        variants.forEach(v => {
          if (v.ensembl_transcript_stable_id === t) {
            if (transcriptMap[t]) {
              transcriptMap[t].variants.push(v)
            } else {
              console.log('transcript not found somehow', t)
            }
          }
        })
        sequences.forEach(s => {
          if (s.id === transcriptMap[t].protein_id) {
            transcriptMap[t].sequence = s.seq
          }
        })
        cds.forEach(s => {
          if (s.id === t) {
            transcriptMap[t].translatedSeq = s.seq
          }
        })
      })

      const ret = transcriptMap[transcriptsFromDomains[0]]
      const gene = ret.domains[0].external_gene_name
      const ret2 = {
        protein: {
          name: ret.name,
          sequences: {
            aminoAcid: ret.sequence,
            translatedDna: ret.translatedSeq.slice(0, -3)
          }
        },
        domains: ret.domains.map(d =>({
            uniqueId: `${d.interpro}_${d.interpro_start}_${d.interpro_end}`,
            start: d.interpro_start,
            end: d.interpro_end,
            seq_id: gene,
            type: d.interpro_short_description,
          })
        ),
        variants: ret.variants.map(v =>({
            uniqueId: v.refsnp_id,
            start: v.translation_start,
            end: v.translation_end+1,
            seq_id: gene,
            score: v.count,
          })
        )
      }
      res.status(200).send(ret2)
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


startServer()
