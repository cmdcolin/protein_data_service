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

The count level information is parsed from  CosmicCodingMuts.vcf from release v87, 13th November 2018. It is pre-processed and loaded into sqlite

Currently accessing Ensembl 95 from biomart

## Sample


Returns JSON object of format

    {
      variants: [],
      domains: [],
      protein: []
    }

A sample element of the variant array is

    {
      "uniqueId": "COSM1736737",
      "start": 236,
      "end": 237,
      "seq_id": "TSPAN6",
      "score": 1
    }

A sample element of the domain array is

    {
      "uniqueId": "IPR000301_8_245",
      "start": 8,
      "end": 245,
      "seq_id": "TSPAN6",
      "type": "Tetraspanin"
    }

A sample sequence is

    
    {
      "name": "TSPAN6",
      "sequences": {
        "aminoAcid": "MASPSRRLQTKPVITCFKSVLLIYTFIFWITGVILLAVGIWGKVSLENYFSLLNEKATNVPFVLIATGTVIILLGTFGCFATCRASAWMLKLYAMFLTLVFLVELVAAIVGFVFRHEIKNSFKNNYEKALKQYNSTGDYRSHAVDKIQNTLHCCGVTDYRDWTDTNYYSEKGFPKSCCKLEDCTPQRDADKVNNEGCFIKVMTIIESEMGVVAGISFGVACFQLIGIFLAYCLSRAITNNQYEIV",
        "translatedDna": "ATGGCGTCCCCGTCTCGGAGACTGCAGACTAAACCAGTCATTACTTGTTTCAAGAGCGTTCTGCTAATCTACACTTTTATTTTCTGGATCACTGGCGTTATCCTTCTTGCAGTTGGCATTTGGGGCAAGGTGAGCCTGGAGAATTACTTTTCTCTTTTAAATGAGAAGGCCACCAATGTCCCCTTCGTGCTCATTGCTACTGGTACCGTCATTATTCTTTTGGGCACCTTTGGTTGTTTTGCTACCTGCCGAGCTTCTGCATGGATGCTAAAACTGTATGCAATGTTTCTGACTCTCGTTTTTTTGGTCGAACTGGTCGCTGCCATCGTAGGATTTGTTTTCAGACATGAGATTAAGAACAGCTTTAAGAATAATTATGAGAAGGCTTTGAAGCAGTATAACTCTACAGGAGATTATAGAAGCCATGCAGTAGACAAGATCCAAAATACGTTGCATTGTTGTGGTGTCACCGATTATAGAGATTGGACAGATACTAATTATTACTCAGAAAAAGGATTTCCTAAGAGTTGCTGTAAACTTGAAGATTGTACTCCACAGAGAGATGCAGACAAAGTAAACAATGAAGGTTGTTTTATAAAGGTGATGACCATTATAGAGTCAGAAATGGGAGTCGTTGCAGGAATTTCCTTTGGAGTTGCTTGCTTCCAACTGATTGGAATCTTTCTCGCCTACTGCCTCTCTCGTGCCATAACAAATAACCAGTATGAGATAGTG"
      }
    }
