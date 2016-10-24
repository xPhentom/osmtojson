#!/bin/bash
# Get .poly file from geofabrik, split up in multiple .poly-files
# Parse every .poly file seperately through Osmosis
# Parse every .osm file with osmtogeojson
# Add to SolR

#set -euo pipefail
IFS=$'\n\t'

adduser() {

#coord=$(cat $bestand | grep -e ".[0-9][0-9]*\."*) 

aantal=$(cat $bestand | grep -c ".[0-9][0-9]*\."*)


if ! (($aantal % 4));then
	#echo "Deelbaar door 4"
	echo "test"
fi

if ! (($aantal % 6)); then
	#echo "Deelbaar door 6"
	poly=$(cat $bestand | grep ".[0-9][0-9]*\."* | head -6)
	end=$(echo $poly | tr -s " " | cut -d ' ' -f 1,2 )
	
	echo $poly $end > belgium1.poly 
	 
fi
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
