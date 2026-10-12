# Convex drafts — host pipeline

`hostCollaborations.js` is the server half of the host Proposals CRM. It is
**not deployed and not imported by the app**: the real Convex project
(schema.js, collaborations.js, …) lives outside this repo.

To switch it on:
1. Copy `hostCollaborations.js` into the Convex project's `convex/` folder and
   reconcile the field names marked `ASSUMPTION` with the real
   `collaborations` table (creator_id / host_id / creator_name / …).
2. Run `npx convex dev` so `api.hostCollaborations.*` is generated.
3. Set `EXPO_PUBLIC_HOST_PIPELINE_BACKEND=convex` and restart Expo.

Until then the Proposals tab keeps using its local AsyncStorage pipeline.
