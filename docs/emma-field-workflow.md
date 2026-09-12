# Emma's field workflow — September 12, 2026

Approved scope: remove project scheduling controls; add a client popup without losing a project draft; street labels on aerial maps; separate measured areas in one saved layout; editable/removable locations; client folders containing multiple project locations; service-aware overview; map-side client, planting and note details; saved layouts attach to estimates, not invoices.

Documents: larger logo above business/service/address text; dedicated unobstructed botanical artwork; requested check-payee and biodiversity thank-you; new review request; no printed draft status or notes/terms; three-line email, website and phone footer.

Implementation boundaries: one editable location/layout per project, multiple measured areas per layout, multiple projects per client folder. Estimate attachments are independent snapshots so later map edits or removal do not silently alter an existing estimate. Internal planting research and notes remain private. Keep the legacy scheduling column without exposing scheduling controls. Remove only a map, not its project or financial history.

Acceptance: popup create/cancel preserves project fields; old scheduling data preserved; location details round-trip with revision protection; street labels visible; multiple area measurements in preview/print; attach/remove snapshot via click and drag/drop; client folders and all three service pins; confirmed map removal; invoice content and one-/multi-page print checks; build, typecheck, lint, data/privacy and browser regressions; publish verified source to main.

Verified locally: production build, TypeScript, lint, all 18 automated data/render/security tests, map mechanics browser suite (desktop, 320/390/768-pixel layouts and touch), and field-workflow browser suite. Visually inspected street labels, separate area labels, mobile document preview, and one-/three-page invoice PDF proofs. New local-only fixtures are identified in temporary test artifact directories; no production client or project data was used.

Release prerequisite: apply the additive `0003_slim_lenny_balinger.sql` migration before deploying this version of the Worker. It adds nullable `estimates.plan_json`; it neither rewrites document prices nor removes legacy scheduling data. The migration has been applied locally only. Source publication to main does not apply the production migration or deploy the Worker.
