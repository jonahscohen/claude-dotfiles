---
name: yesandwebsite (yesandagency) local env spun up via Lando for Justify work
description: Jonah (2026-06-05) asked to spin up the yesandagency local project to resume Justify work. The project is /Users/spare3/Documents/Github/yesandwebsite (sibling repo, NOT in claude-dotfiles) - a WordPress site run via Lando. `lando start` brought it up; verified the real Yes& homepage renders at http://yesand.lndo.site/. Justify is the microadjustment tool in claude-dotfiles/justify/ that injects into this running site.
type: reference
relates_to: [session_2026-05-29_endow_to_justify_rename.md]
---

Collaborator: Jonah. 2026-06-05.

## The two things and how they relate
- "yesandagency local project" = /Users/spare3/Documents/Github/yesandwebsite (its own git repo, branch fix/vibe-score-90pct-timeout, has its own .claude/memory beats re: VIBE score work). WordPress site, Lando recipe `wordpress` (php 7.4, nginx, mariadb, app name `yesand`).
- Justify = the microadjustment toolbar in claude-dotfiles/justify/ (improv -> offers -> endow -> justify). Runs a WebSocket server (server/index.ts, DEFAULT_WS_PORT 9223) registered as an MCP server; serves justify-core.js (init.sh references https://localhost:9224/justify-core.js). `justify/cli/init.sh` wires a target project to load justify-core (detects wordpress via wp-config.php). So you run the site, inject Justify, then microadjust it.

## How to spin up the local site (verified)
- Prereqs present: Lando v3.25.6, Docker running.
- `cd /Users/spare3/Documents/Github/yesandwebsite && lando start`.
- URLs: http://yesand.lndo.site/ and https://yesand.lndo.site/ (self-signed; curl needs -k). Also phpMyAdmin + Mailhog on mapped localhost ports. `lando list` shows containers yesand_{appserver_nginx,appserver,database,mailhog,pma,node}.
- VERIFIED: curl https://yesand.lndo.site/ -> HTTP 200, 782KB, <title>Yes&amp; Agency</title>, 185 wp-content refs. Chrome screenshot: full homepage renders - dark-green brand bar (yes& / Lipman Hearne / CommCore / Beacon), nav (HOME ABOUT [red & logo] WORK INSIGHTS CONTACT), ampersand-mask hero over a chrome video. Site has an intro preloader (red progress bar) - wait ~5s for full render.

## Known non-blocking warning
`lando start` post-start event reported "UNKNOWN ERROR". The post-start runs (1) wp core download/install ONLY if wp-config.php missing (it exists -> skipped) and (2) `composer update`. The failure is the composer step; the site serves 200 because vendor/ is committed. Not blocking local dev; only matters if a composer dep needs refreshing.

## To actually use Justify on the site (next, not yet done)
- Bring up the Justify server/MCP and run `bash justify/cli/init.sh /Users/spare3/Documents/Github/yesandwebsite` (detects wordpress) to wire justify-core into the site, then reload. Confirm direction with Jonah before injecting.

## Files
- (no repo files changed; env brought up. This beat lives in claude-dotfiles since that is the active session repo.)
