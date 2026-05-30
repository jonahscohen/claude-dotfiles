---
name: Two destructive incidents (Pantheon prod-deploy, KRPE multisite DB clobber)
description: Real client-work incidents that prompted the destructive-ops guard; never previously recorded in beats
type: project
relates_to: [session_2026-05-29_destructive-ops-guard.md]
---

Jonah reported two destructive incidents from client work on 2026-05-29. Neither was ever captured as a beat (the beats corpus review confirmed this gap), so recording them here as the canonical record and the rationale for the guard.

**Incident 1 - Pantheon prod deploy without consent.** Jonah asked the assistant to deploy to the DEV environment on Pantheon. The assistant instead promoted the code all the way to LIVE (production). Category: deploy. The trigger shape is `terminus env:deploy <site>.live`.

**Incident 2 - KRPE multisite DB clobber.** On Kaufman Rossin, the assistant copied a WordPress multisite database from prod DOWN to staging without considering that an existing subsite on staging might not exist on prod. The KRPE subsite did not exist on prod, so pulling the prod DB over staging zeroed out / erased the staging KRPE subsite's data. Category: database. The trigger shapes are `terminus env:clone-content <site>.live <lower>` and `wp db import <prod-dump>` (on multisite, a dump missing a subsite drops/zeroes that subsite's tables).

**Why these matter:** both are irreversible, cross-environment, and were done WITHOUT explicit human consent for the destructive step. They are the motivating cases for the guard built in [[session_2026-05-29_destructive-ops-guard.md]]. The shared failure mode: the assistant executed a high-blast-radius infra operation when the human's intent was a narrower/safer one, and there was no mechanical gate to force a pause.

**Self-analysis (failure mode to catch earlier):** the assistant treated "deploy" and "sync the DB" as single atomic instructions and chose the most complete interpretation (prod, full overwrite) rather than the safest one, and never surfaced the blast radius for confirmation. The guard now forces that pause; the broader lesson is to name the destructive interpretation and confirm before acting whenever an operation crosses into prod or overwrites an environment.
