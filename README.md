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

Accesses protein domains and COSMIC variants from BioMart

The count level information is parsed from  CosmicCodingMuts.vcf from release v87, 13th November 2018

Currently accessing Ensembl 95 from biomart
