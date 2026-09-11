# Aerial imagery provenance

Positioning uses the existing USGS National Map imagery cache. Locking loads a detailed USDA NAIP image for the exact geographic extent, with explicit aspect-ratio handling so annotations remain aligned.

- Provider: USDA FPAC-BC, Geospatial Enterprise Operations.
- Service: https://apps.geo.fpac.usda.gov/geo-imagery/rest/services/naip/conus_naip/ImageServer
- Attribution: USDA FPAC-BC · NAIP aerial imagery.
- Public-domain statement: https://www.fpacbc.usda.gov/geospatial-services/customer-services
- Example verified 2026-09-10: Peoria source raster 48426, acquired 2025-08-14, native 0.6-metre pixels. Dates and native resolution vary by site. Do not infer local resolution from global service metadata or exported pixel dimensions.
- Export API: https://developers.arcgis.com/rest/services-reference/enterprise/export-image/
- Lock requests have a 45-second timeout and 24 MB response ceiling; longest image dimension is capped at 3072 pixels. The progress bar is indeterminate while the provider renders, byte-based when a response length is available, and completes after image decoding. Cancellation ignores late results.
- The saved frame contains geographic bounds and provider ID, not an ephemeral provider output URL. Previews request fresh imagery for that frame, so the provider may update photography later. This is not an immutable survey or an offline map.
- Illinois ISGS high-resolution services were considered but not used: their current terms restrict commercial use. https://isgs.illinois.edu/terms-of-use/

Leaflet-Geoman free (MIT) supplies the interactive polygon drawing/editing engine. Map labels remain text nodes, not injected HTML. Project item costs, supplier links, private notes and photos are not copied into customer-facing labels.
