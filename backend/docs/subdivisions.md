# Admin-approved subdivisions

ServiceArea is the parent coverage group (e.g. Ibadan, Oyo, NG). ServiceSubdivision records are the explicit approved areas beneath it. Both parent and subdivision must be active. Parent names alone never authorize a booking. State and country checks are mandatory.

Existing approved aliases were copied into subdivision records during migration. The legacy aliases database column is retained for migration history but is no longer read or editable through the API. No parent name was approved automatically. Existing bookings and fare snapshots are preserved.

## Admin API

All endpoints require a verified ADMIN Bearer token.

- GET /api/v1/admin/service-areas/:id/subdivisions (limit, offset, optional active filter).
- POST /api/v1/admin/service-areas/:id/subdivisions with { "name": "Ibadan South West" }. Optional mapboxId and active fields.
- PATCH /api/v1/admin/service-areas/:id/subdivisions/:subdivisionId with name, mapboxId or active. Each update affects only that subdivision. Set active=false to withdraw approval, or true to restore it. Set mapboxId=null to return to name matching.

Names are unique per parent after case/space normalization. Mapbox IDs are unique per parent. Wrong-parent subdivision IDs return 404. Deactivating a parent disables all its subdivisions for new bookings without changing their individual status.

## Matching

Search addresses now returns cities, lgas and areaFeatures. areaFeatures contains Mapbox administrative IDs (place/locality/district) and names. Address IDs select pickup/delivery; administrative IDs optionally identify the approved subdivision. They are different IDs.

When a subdivision has a Mapbox ID, matching requires that exact administrative ID and does not fall back to its name. Without an ID, exact normalized Mapbox city/LGA name is used. Missing metadata fails closed. Admins approve coverage explicitly. Names containing Ibadan are not automatically approved.

Quote creation and booking creation both check current approvals. Existing bookings remain valid after later approval changes. Approval updates synchronize with booking creation using parent-row locks.

## Postman

Reimport the updated collection while preserving your private local credentials. Set serviceAreaId to your existing parent ID. List approved subdivisions to inspect migrated records. POST to add another approval; save its subdivisionId for individual updates. Search results show the Mapbox area name/ID to approve. Get a fresh quote after configuration changes.
