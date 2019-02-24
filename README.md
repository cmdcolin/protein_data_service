# protein-data-service

Collects some data from different resources about genes/proteins


## Install

    yarn

## Run

    node server.js

## Usage


    curl http://localhost:2999/geneid

Where geneid is a Entrez gene ID



## Data sources

mygene.info
biomart
cosmic

Example biomart query

http://useast.ensembl.org/biomart/martview/80f49d5875612b5f224d2f4a1d0f5b91?VIRTUALSCHEMANAME=default&ATTRIBUTES=hsapiens_gene_ensembl.default.feature_page.ensembl_gene_id|hsapiens_gene_ensembl.default.feature_page.ensembl_transcript_id|hsapiens_gene_ensembl.default.feature_page.family|hsapiens_gene_ensembl.default.feature_page.family_description|hsapiens_gene_ensembl.default.feature_page.interpro|hsapiens_gene_ensembl.default.feature_page.interpro_short_description|hsapiens_gene_ensembl.default.feature_page.interpro_description|hsapiens_gene_ensembl.default.feature_page.interpro_start|hsapiens_gene_ensembl.default.feature_page.interpro_end|hsapiens_gene_ensembl.default.feature_page.uniprotswissprot|hsapiens_gene_ensembl.default.feature_page.entrezgene|hsapiens_gene_ensembl.default.feature_page.refseq_mrna&FILTERS=&VISIBLEPANEL=resultspanel
