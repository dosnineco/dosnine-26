#!/bin/bash

# Logo Image Rename Helper
# Run this script from the logos directory after downloading all images

echo "🎨 Logo Image Rename Helper"
echo "=============================="
echo ""
echo "Instructions:"
echo "1. Download all 13 images from chat to this folder"
echo "2. The script will help you identify and rename them"
echo ""
echo "Press Enter to start..."
read

cd "$(dirname "$0")"

echo ""
echo "Current files in directory:"
ls -1

echo ""
echo "Let's rename them one by one..."
echo ""

# Helper function
rename_file() {
    echo "Which file is $2?"
    echo "Type the current filename (or 'skip' to skip):"
    read current_name
    
    if [ "$current_name" != "skip" ] && [ -f "$current_name" ]; then
        mv "$current_name" "$1"
        echo "✅ Renamed to $1"
    else
        echo "⏭️  Skipped"
    fi
    echo ""
}

# Before images
echo "=== BEFORE IMAGES (Complex originals) ==="
rename_file "skinz-before.jpg" "Skinz & Tattooz - pink/purple gradient on black"
rename_file "ea-before.jpg" "e.a Big Deal - with blue text and car graphic"
rename_file "wlp-before.jpg" "WLP - red text with black strikethrough"
rename_file "wata-pon-before.jpg" "Wata Pon Dryland - 3D blue text with umbrellas"
rename_file "tm-before.jpg" "T&M Air Conditioning - blue and yellow colored logo"
rename_file "ready-before.jpg" "READY Premium Hydration - simple black text"

echo ""
echo "=== AFTER IMAGES (HTV-ready / Physical results) ==="
rename_file "skinz-after.jpg" "Skinz & Tattooz - black outline only"
rename_file "ea-after.jpg" "e.a Big Deal - photo of black vinyl on WHITE CAP"
rename_file "wlp-after.jpg" "WLP - screenshot showing 'Convert Upload To'"
rename_file "wata-pon-after.jpg" "Wata Pon - in Cricut Design Space (hand visible)"
rename_file "tm-after.jpg" "T&M - photo of white vinyl on DARK SURFACE"
rename_file "ready-after.jpg" "READY - photo of vinyl on BOTTLE"
rename_file "exquisite-after.jpg" "Exquisite Backyard - gold text on black"

echo ""
echo "✨ Done! Final files:"
ls -1 *.jpg 2>/dev/null || ls -1 *.png 2>/dev/null || echo "No image files found"

echo ""
echo "Now refresh your browser to see the gallery!"
