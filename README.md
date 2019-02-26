# protein-data-service

Collects some data from different resources about genes/proteins


## Install

    yarn

## Run

    node server.js

## Usage


    http://localhost:2999/?ensemblGeneId=ENSG00000000003&ensemblTranscriptId=ENST00000373020

* ensemblGeneId: required
* ensemblTranscriptId: optional, is a filter, cannot be specified without a gene id

The reason a transcript ID cannot be specified by itself is that the variation biomart only filters on gene ID


## Data sources

Accesses protein domains and COSMIC variants from BioMart

The count level information is parsed from  CosmicCodingMuts.vcf from release v87, 13th November 2018

Currently accessing Ensembl 95 from biomart

## Sample


Returns JSON object of format

    {
      variants: [],
      domains: []
    }

A sample variant is

    {
      refsnp_id: "COSM5878431",
      refsnp_source: "COSMIC",
      chr_name: "X",
      chrom_start: "100630833",
      chrom_end: "100630833",
      ensembl_gene_stable_id: "ENSG00000000003",
      ensembl_transcript_stable_id: "ENST00000373020",
      ensembl_transcript_chrom_strand: "-1",
      ensembl_type: "protein_coding",
      consequence_type_tv: "coding_sequence_variant",
      consequence_allele_string: "G/COSMIC_MUTATION",
      cdna_start: "815",
      cdna_end: "815",
      ensembl_peptide_allele: "",
      translation_start: "235",
      translation_end: "235",
      cds_start: "703",
      cds_end: "703",
      distance_to_transcript: "2163",
      count: 2
    },

A sample domain is

    {
      ensembl_gene_id: "ENSG00000000003",
      uniprotswissprot: "O43657",
      entrezgene: "7105",
      refseq_mrna: "NM_003270",
      description: "tetraspanin 6 [Source:HGNC Symbol;Acc:HGNC:11858]",
      chromosome_name: "X",
      start_position: "100627109",
      end_position: "100639991",
      external_gene_name: "TSPAN6",
      ensembl_transcript_id: "ENST00000373020",
      family: "PTHR19282_SF169",
      family_description: "TETRASPANIN 6 TSPAN 6 TRANSMEMBRANE 4 SUPERFAMILY MEMBER 6",
      interpro: "IPR018499",
      interpro_short_description: "Tetraspanin/Peripherin",
      interpro_description: "Tetraspanin/Peripherin",
      interpro_start: "18",
      interpro_end: "235"
    },

