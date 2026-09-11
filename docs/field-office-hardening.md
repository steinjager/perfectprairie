# Field Office mechanics upgrade

## Intent

Make project planning the starting point for materials, map placements and financial documents. Preserve existing customer records, prices, private markup, Cloudflare Access and the public brand.

## Build and acceptance plan

1. Replace fragile polygon controls with a maintained Leaflet drawing engine. Complete by first corner, double-click, Enter or a persistent Finish button; edit vertices, move whole shapes, remove, undo and redo. Tools toggle directly. Keep touch targets usable.
2. Separate map navigation from editing: find the site, **Lock map position**, load detailed aerial imagery with cancellable flower/progress feedback, then edit. Unlock without losing annotations. Saved projects reopen at the saved site. Never claim resolution the imagery does not contain.
3. Persist project items (seed mixes, plants, materials, labor and notes): quantity, unit, internal unit cost, source link, internal notes and private photo. Provide create/edit/archive and a billable selection.
4. Map item palette: select an item, click the map, drag the placement. Labels are customer-facing; supplier links, costs, photos and internal notes are not copied to public maps.
5. Create estimates/invoices from selected project items as independent price snapshots; never silently synchronize issued documents. Existing estimates still convert to invoices.
6. Harden recovery, draft protection, saved-vs-refresh feedback, navigation, keyboard and mobile behavior. Validate actual first-corner completion, reshape/move, lock cancellation/retry, item persistence and document transfer.
7. Run migration/data/privacy tests, build, lint, typecheck and browser acceptance. Publish approved code to main; verify remote parity. Keep deployment and Git publication distinct in the release report.

## Data and safety

- Additive schema only. Existing line items and prices retain their values.
- D1 owns item metadata; private R2 owns uploaded photos. No public bucket.
- Items are archived, not destructively deleted. Map placements retain a label snapshot.
- No new external marketing emails or changes to customer records during testing.
- Imagery is historical; areas are planning estimates, not a land survey.

## Verified locally, 2026-09-10

- Production build, TypeScript and lint pass; 17 data, geometry, privacy and rendered-page tests pass.
- Repeatable browser regression (`npm run test:browser`, local dev server required): real aerial image decode; first-corner completion; vertex movement; undo; self-intersection rollback; corner removal; whole-area dragging; repeated project-item placement; price snapshot transfer; saved-plan reopening; 390px layout; cancelled loading; touch first-corner closure and vertex dragging.
- A real JPEG/PNG upload through the notebook UI was optimized to a 1600px JPEG, saved in local R2 and fetched successfully after saving.
- Browser QA found and fixed map-class clobbering, deferred undo snapshots, marker click interception, and fractional-zoom fitting. These checks are deliberately interaction-level, not only build checks.
- Production dependency audit: zero reported vulnerabilities. Existing development-tool advisories were not force-upgraded across breaking versions.

The browser suite creates clearly named local-only fixtures and writes their IDs and screenshots to a temporary `prairie-mechanics-*` directory. Do not aim it at production. Clean up only those recorded fixture IDs from local D1 after testing.

## Operational limits

- Internet is needed for aerial imagery and saving; this is not an offline field app.
- NAIP is historical government aerial photography; 3072px exports do not manufacture ground resolution.
- Existing customer documents remain independent price snapshots. Importing project items into an edited document is an explicit replacement with confirmation.
- Archived item placements keep their saved customer-safe labels. Changing an item does not silently rename existing map labels or recalculate invoice quantities.
- Replaced/removed private photo blobs are retained in R2; no automatic destructive purge is performed in this release.
