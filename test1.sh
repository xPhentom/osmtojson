#!/bin/bash
# Get .poly file from geofabrik, split up in multiple .poly-files
# Parse every .poly file seperately through Osmosis
# Parse every .osm file with osmtogeojson
# Add to SolR

#set -euo pipefail
IFS=$'\n\t'

adduser() {
coord=$(cat $bestand | grep -e ".[0-9][0-9]*\."*) 
echo $coord
}


#CASE : add of del en anders help
if [ $# == "0" ]
	then
	echo "==> Enter parameters!"
else

until [ $# == "0" ]
do
	case "$1" in
	*".poly" ) bestand="$1"
		       adduser ;;
	# "help" | "-h" | "?" ) help ;;
	# "" | " " ) help ;; 
	* ) echo "Geef de juiste parameters op!" ;;
    esac
    shift
done
fi
exit