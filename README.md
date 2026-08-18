# WA Biodiversity Portal

An interactive web portal to explore the conservation status, threats, and management of Western Australia's biodiversity assets.

This project contains a static webpage (with JSONP queries fetching data from a CKAN data catalogue).

## Project description

This project serves two purposes. Firstly, it makes information about the conservation status and trends of Western Australian biodiversity assets available to decision makers and planners. The data that are shown live in a CKAN data catalogue. In this case, the data are sourced from an intranet-only CKAN instance and will only be visible to visitors from inside the intranet of the Department of Parks and Wildlife, Western Australia.

Secondly, it serves as an example of summarising and visualising data from CKAN, and how to access the API. Although an external viewer will not see any data, the code will demonstrate how to access and summarise GeoJSON, CSV (through the datastore API) and other data from CKAN.

## Development

Use Python to serve the application locally:

```bash
python -m http.server 8080
```

(http://localhost:8080)

There's no build step. RequireJS (`js/main.js`) loads the browser modules at
runtime, so a fresh clone runs as-is. You only need bun when updating libraries.

## Dependencies

Browser libraries are installed with [bun](https://bun.sh/) and committed under
`js/lib/` and `css/`, so a clone runs without bun and version changes show up as
diffs in review. `scripts/sync-deps.sh` copies them out of `node_modules/` into the
paths RequireJS expects.

```bash
bun install          # first time only
bun run deps:update  # bun update, then copy the files into place
```

Check the site in a browser, then commit `package.json`, `bun.lock` and the changed
files under `js/lib/` and `css/`.

Use `bun run deps:check` to see what's available, or `bun run deps:sync` to re-copy
without changing versions. If a library moves its files around, the sync exits with
an error naming the missing path; update the paths in the script when that happens.

**Don't hand-edit anything under `js/lib/`.** The next update overwrites it and the
change disappears without warning. Eg: `dataTables.bootstrap5.js`
had been edited to rename its dependency from `datatables.net` to `datatables`, and
when the file was later replaced, that id no longer resolved. Because `router.js`
loads the TNM views up front, one bad id stopped every page rendering. The mapping
lives in `js/main.js` now, which is where to fix that kind of mismatch.

Dependabot only updates `package.json` and `bun.lock` and can't run the copy script,
so its PRs leave `js/lib/` untouched. Run `bun install && bun run deps:sync` and
commit the result onto the same branch before merging.

Everything currently tracks the latest release, so there are no held-back versions
and no `ignore` rules in `.github/dependabot.yml`.

### Libraries maintained by hand

These aren't on npm, so the sync leaves them alone: `recline.js`,
`recline.dataset.js`, `csv.js` and `ckan.js`. All are unmaintained upstream, and the
last two are Recline backends that were never published separately.

### Notes on the current major versions

Worth knowing if something looks odd, or before upgrading further:

- **jQuery 4** removed `$.parseJSON`, so `tableFacade.js` uses `JSON.parse`.
  jQuery UI 1.14 works on jQuery 4. Note `.selector` has been gone since jQuery 3
  and a couple of call sites still relied on it, which is why views pass elements
  rather than selector strings.
- **DataTables 3** renamed `settings.aoColumns` to `settings.columns`, and no longer
  attaches itself to jQuery on load, so `tableFacade.js` calls `DataTable.use($)`
  before touching `$.fn.DataTable`.
- **Leaflet 1.9** replaced the 0.7 API. The `leaflet.ajax` plugin was built for 0.7
  and is unmaintained, so `map.js` loads the region GeoJSON with `fetch` and
  `L.geoJSON` instead. That plugin is gone from `js/lib/`.
- **Backbone 1.6** declares its own AMD dependencies, so it needs no `shim` entry in
  `js/main.js`.

## Docker

Three stages: bun installs the libraries and runs the sync, an Alpine stage collects
only the files that should be served, then nginx serves them on port 8080.
`node_modules/`, `package.json` and `bun.lock` only exist in the first stage.

```bash
docker build -t biodiversityaudit2:local .
docker run --rm -p 8080:8080 biodiversityaudit2:local
```

## Compression

`nginx.conf` enables gzip, which wasn't on before. It takes the largest text assets
from roughly 16.6 MB down to 1.7 MB, mostly the datasets in `data/`. Those datasets
are also cached now, on the same one hour policy as the other static assets, so a
data update reaches clients within the hour rather than being re-downloaded on every
visit. The comments in that file explain the details.
