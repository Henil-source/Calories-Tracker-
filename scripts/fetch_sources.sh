#!/usr/bin/env bash
# Download the open datasets used by build_food_db.py into DIR (default ../data-src).
# Official homes: fdc.nal.usda.gov (USDA), ciqual.anses.fr (ANSES). The GitHub mirrors below hold the same files.
set -euo pipefail
DIR="${1:-../data-src}"
mkdir -p "$DIR" && cd "$DIR"
clone() { [ -d "$2" ] || GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 "$1" "$2"; }
clone https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB- indb
clone https://github.com/OlivierFitter/ciqual_2025_complete ciqual-src
mkdir -p ciqual && unzip -o -q ciqual-src/ciqual_2025_complete.json.zip ciqual_2025_complete.json -d ciqual
clone https://github.com/sukiboo/nutrition_info fndds-src
mkdir -p fndds && cp fndds-src/data/FoodData_Central_survey_food_json_2022-10-28.json fndds/
clone https://github.com/cokegoddo/caloriebase sr-src
mkdir -p sr && cp sr-src/data/sr/{FOOD_DES,NUT_DATA,WEIGHT,FD_GROUP}.txt sr/
echo "Sources ready in $DIR"
