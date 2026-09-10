# Field Office implementation plan

Authorized scope: implement, validate, publish source to main, and deploy to the existing Perfect Prairie Cloudflare Worker.

## Product intentions

- Maintain the rust and cream Field Office with clear, standard record lists, detail/edit dialogs, Save/Cancel, validation, progress, and recoverable errors.
- Edit clients, projects, estimates, invoices, their linked records, dates, statuses, notes, and ordered line items. Preserve existing document numbers and existing prices.
- New quotes use 30% **markup on cost** by default ($100 cost becomes $130 price), adjustable per document. Internal cost and markup are visible only in the protected Field Office. Customer outputs include only final prices. Existing documents migrate with 0% markup and retain their exact amounts.
- Projects expose Add map / Edit map. Request the device location when the editor opens; permission, accuracy, and device support remain browser-controlled. Offer My location, Project location, and manual coordinate navigation. Never move an existing plan's coordinates when locating the device.
- Satellite-style aerial map: draw polygons; name/recolor areas; adjust vertices; show estimated square feet and acres; place and drag prairie, flower, tree, water, and habitat symbols plus text labels; delete selected features; undo; preserve edits on failed save; warn before discarding changes.
- Save map geometry and viewport in D1. Render a compact aerial map preview on project cards, customer project pages, and estimates/invoices. An overview map presents linked project pins.
- Customer project pages use unguessable, revocable share links. Expose only the project name, customer-facing summary, map, and explicitly shared non-draft documents. No internal costs, markup, client contact details, or field notes. Pages must not be indexed or cached; external imagery must receive no referrer containing the share token.
- Print/PDF and digital documents contain the mapped project preview, customer project link when sharing is enabled, existing native artwork, and Google review QR.

## Implementation and verification

1. Add additive D1 migration and strict server validation; integer money arithmetic; revision checks to prevent lost updates; transactional document line replacement; request-isolated database bindings.
2. Build shared record editors, document preview, estimate-to-invoice workflow, and consistent searchable lists with status filters.
3. Build the Leaflet map editor, USGS imagery, geometry utilities, project previews and pin overview; add protected save and revocable sharing endpoints plus sanitized public pages.
4. Exercise complete workflows against an isolated SQLite/D1-compatible test database: create/edit all records, multiple lines and rounding, conflicts, invalid values, map persistence, token revocation and customer-data exclusions.
5. Build, typecheck, lint and rendered route checks; desktop/mobile interaction and print verification; preserve production data with an additive migration.
6. Fetch main; commit only this feature and the previously deployed Field Office source/assets; push main; apply the inspected migration; deploy; verify public site, Access protection, review route, new assets, and active deployment. Record observed limitations honestly.

## Imagery provenance

USGS The National Map, USGSImageryOnly aerial/satellite basemap. Attribution: USDA, USGS The National Map: Orthoimagery. Source: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer. Central Illinois imagery is public-domain CONUS NAIP imagery; it is historical aerial imagery, not live imagery. Keep attribution on interactive, preview and printed maps. Measurements are planning estimates, not a land survey.

## Release results

Validated September 10, 2026:

- Production build, TypeScript and ESLint pass; all 13 automated tests pass. No forbidden brand/copy drift in app or public source.
- Local browser acceptance completed the client → project → drawn map → multi-line estimate → converted invoice → price edit → customer page workflow. The mapped-project pin reopened the saved plan. A text label was dragged and a habitat symbol placed inside the polygon. No JavaScript errors or document overflow at desktop and 390px mobile widths.
- Verified actual high-zoom USGS images. The advertised tile cache returns 404 at some close zoom levels, so levels above 16 use the public export renderer. Cached overview tiles and exports retain the same Web Mercator coordinates.
- Rendered and visually inspected the Letter PDFs: a two-item mapped invoice fits on one page; a 50-item invoice spans three pages, repeats table headings, and retains the project link, artwork and review QR. Internal costs and markup are absent.
- Server integration tests cover legacy price preservation, item replacement, money rounding, status edits, stale-save conflicts (including a race at the batch boundary), invalid payloads, map persistence, customer-link revocation, and private-field/analytics exclusions.
- Device location was verified with an emulated browser location and a denied-permission fallback. Actual device permission/accuracy and internet connectivity remain device-dependent; imagery is historical and external. No offline mode, cadastral survey guarantees, automatic invoice emailing, or payment processing are implied.
- Backed up production D1 before the additive migration. Existing record counts: one client, one project, no estimates, one invoice. Publishing and post-deploy checks follow below.

Production release:

- Source upgrade published to main; the additive migration applied successfully to the existing operations database. No records were deleted or replaced.
- Deployed through the existing Worker and all three configured domains, without changing DNS or Access permissions. Public homepage returned 200; the review route retained the direct Google review destination; invalid customer links returned 404 with no-store/noindex/no-referrer headers.
- Renewed the existing owner Google session through Cloudflare Access and confirmed the upgraded production interface loads the original records. The legacy invoice retains its original price with 0% added markup. No customer links were enabled and no production records were modified during acceptance.
- Added a final guard against late device-location callbacks moving the view after plotting starts; malformed numeric values and non-allowlisted icon identifiers are rejected. Re-ran build, 13 tests, lint and typecheck before publishing this safeguard.
