#!/usr/bin/env bash
#
# Copies library files from node_modules/ into js/lib/ and css/, where RequireJS
# and index.html expect them. Run after bun install or bun update.
#
#   bun run deps:sync
#
# Exits non-zero if a source file is missing, so a package changing its layout
# fails here instead of shipping a broken app.
#
# These libraries aren't on npm and are maintained by hand. Don't add them:
#   js/lib/recline.js, js/lib/recline.dataset.js  unmaintained
#   js/lib/csv.js, js/lib/ckan.js                 recline backends
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NM="$ROOT/node_modules"

copied=0
errors=0

copy_file() {
	local src="$NM/$1" dest="$ROOT/$2"

	if [ ! -f "$src" ]; then
		echo "  missing: node_modules/$1" >&2
		errors=$((errors + 1))
		return
	fi

	mkdir -p "$(dirname "$dest")"
	cp "$src" "$dest"
	echo "  $2"
	copied=$((copied + 1))
}

# Copies directory contents without deleting existing files.
copy_dir() {
	local src="$NM/$1" dest="$ROOT/$2"

	if [ ! -d "$src" ]; then
		echo "  missing: node_modules/$1" >&2
		errors=$((errors + 1))
		return
	fi

	mkdir -p "$dest"
	cp -R "$src"/. "$dest"/
	echo "  $2"
	copied=$((copied + 1))
}

if [ ! -d "$NM" ]; then
	echo "node_modules/ not found - run 'bun install' first" >&2
	exit 1
fi

echo "Syncing from node_modules/"

copy_file "jquery/dist/jquery.min.js" "js/lib/jquery.min.js"

# ui-lightness is the theme this site has always used.
copy_file "jquery-ui/dist/jquery-ui.min.js" "js/lib/jquery-ui.min.js"
copy_file "jquery-ui/dist/themes/ui-lightness/jquery-ui.min.css" "css/jquery-ui/jquery-ui.min.css"
copy_dir "jquery-ui/dist/themes/ui-lightness/images" "css/jquery-ui/images"

copy_file "jquery.scrollto/jquery.scrollTo.js" "js/lib/jquery.scrollTo.js"
copy_file "jquery.scrollto/jquery.scrollTo.min.js" "js/lib/jquery.scrollTo.min.js"

copy_file "underscore/underscore-min.js" "js/lib/underscore-min.js"

# Not currently loaded by js/main.js, but kept here so it stays patched.
copy_file "lodash/lodash.js" "js/lib/lodash.js"
copy_file "lodash/lodash.min.js" "js/lib/lodash.min.js"

copy_file "backbone/backbone.js" "js/lib/backbone.js"
copy_file "backbone/backbone-min.js" "js/lib/backbone-min.js"

copy_file "leaflet/dist/leaflet.js" "js/lib/leaflet.js"
copy_file "leaflet/dist/leaflet-src.js" "js/lib/leaflet-src.js"
copy_file "leaflet/dist/leaflet.css" "css/leaflet/leaflet.css"
copy_dir "leaflet/dist/images" "css/leaflet/images"

# Destination filename kept as jquery.dataTables.js to match the alias in js/main.js.
copy_file "datatables.net/js/dataTables.js" "js/lib/jquery.dataTables.js"
copy_file "datatables.net-bs5/js/dataTables.bootstrap5.js" "js/lib/dataTables.bootstrap5.js"
copy_file "datatables.net-bs5/css/dataTables.bootstrap5.css" "css/dataTables.bootstrap5.css"

copy_dir "bootstrap/dist/css" "css/bootstrap/css"
copy_dir "bootstrap/dist/js" "css/bootstrap/js"

copy_file "requirejs/require.js" "js/lib/require.js"
# Lives in js/ rather than js/lib/ because RequireJS resolves 'text' against baseUrl.
copy_file "requirejs-text/text.js" "js/text.js"

if [ "$errors" -gt 0 ]; then
	echo "Failed: $errors source path(s) not found. Check node_modules/ and update the paths above." >&2
	exit 1
fi

echo "Done - $copied copied."
