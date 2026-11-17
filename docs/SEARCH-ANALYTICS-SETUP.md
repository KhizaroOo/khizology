# Search and analytics setup runbook

Current setup and verification runbook. Owner-confirmed Search Console/Bing setup and earlier submission receipts are dated evidence in [MISSION-5-VALIDATION](MISSION-5-VALIDATION.md) and [SEARCH-MEASUREMENT-BASELINE](SEARCH-MEASUREMENT-BASELINE.md). Check current account state before repeating setup. Earlier release/submission permission does not authorize a new action. The workflow maps repository variable `GA_MEASUREMENT_ID` into the build; verify its current configured value without printing credentials.

## Google Search Console — human

1. Open [Search Console](https://search.google.com/search-console/). Add **Domain property** `khizooology.com`.
2. Copy Google's exact TXT verification record into GoDaddy DNS. Verify ownership and retain the record afterward. No HTML token is needed.
3. Submit `https://khizooology.com/sitemap-index.xml`. Optionally submit `https://khizooology.com/image-sitemap.xml` separately. Confirm Google can read the sitemap.
4. Report VERIFIED / NOT VERIFIED and sitemap status. After deployment, use the priority list in INITIAL-INDEXING-URLS.md; do not request every tool individually.

## GA4 — human

1. Open [Google Analytics](https://analytics.google.com/), create/select an account, create the **Khizooology** GA4 property, and create a Web stream for `https://khizooology.com/`.
2. **Disable Enhanced Measurement for this stream before deployment.** Automatic search, outbound-link, file-download and form measurement can collect terms, URLs and filenames beyond this site's safe event contract. Manual page views are already implemented. Keep Google Signals and advertising/personalization features disabled. Do not enable user-provided data collection.
3. Provide only the real `G-…` Measurement ID. No passwords, API secrets or Google credentials are needed.
4. Configure repository **variable** `GA_MEASUREMENT_ID`; the deployment workflow maps it to `PUBLIC_GA_MEASUREMENT_ID` during build. No ID is committed. Local builds with no variable succeed and never load GA.
5. After the approved deployment, confirm a consented session in GA Realtime. A script tag alone is insufficient evidence.

## Bing — human

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters/) after Search Console verification.
2. Import `khizooology.com` from Search Console, authorize the import yourself, and confirm the site status. If import is unavailable, use a supported verification method with Bing's actual value.
3. Confirm the normal sitemap imported successfully before adding it again. The image sitemap is also advertised in robots.txt.
4. Report CONNECTED / NOT CONNECTED and sitemap status. Check IndexNow reporting after its first submission.

## Required reply before production configuration

- Search Console: VERIFIED / NOT VERIFIED; sitemap status.
- Bing: CONNECTED / NOT CONNECTED; sitemap status.
- GA4: real Measurement ID; Enhanced Measurement OFF confirmed.
- Approval for commit/push/deployment when ready.

## IndexNow operation

The 32-character random hexadecimal key in `scripts/indexnow-config.json` is intentionally public. Its matching `public/<key>.txt` contains exactly the key, without a newline. It is ownership proof, not a private API credential. Never place account credentials or DNS/OAuth verification values in these files.

Run `npm run build` then `npm run indexnow:check` for a local dry run. After deployment and account setup, explicitly run `npm run indexnow:submit`. The script verifies the live key and sitemap match the local build before posting:

```json
{
  "host": "khizooology.com",
  "key": "<actual public key loaded by script>",
  "keyLocation": "https://khizooology.com/<actual public key>.txt",
  "urlList": ["<canonical URLs derived from the built sitemap>"]
}
```

Endpoint: `https://api.indexnow.org/indexnow`. The first submission selects all current canonical indexable URLs (derived from the current build). Noindex pages, redirects, duplicates, foreign hosts and query/hash URLs fail validation. Network errors and non-200/202 responses fail visibly. HTTP 202 means received with key validation pending; 200 means received. Neither proves indexing. IndexNow serves participating search engines, not Google.

There is no automatic deploy hook. Invoke explicitly again only after meaningful content changes. Avoid repeated blind retries; for 403 check the hosted key, 422 the host/payload, and 429 wait before retrying.

## Consent and measurement contract

Unknown and declined choices do not create a Google queue, load a Google script, or send cookieless pings. Accepted consent loads GA asynchronously once and sends a single explicit page_view. The code keeps advertising storage, ad user data and personalization denied and disables Google Signals. Canonical path and static title replace the browser URL, excluding query/hash state. The helper locally checks the browser-provided referrer and includes only scheme/hostname roots for its exact public-host allowlist in consented events. Paths, queries, fragments, credentials, non-default ports, same-site and unlisted hosts are excluded; referral addresses are not persisted in browser storage. Local checks are distinct from transmission. Public tag inspection does not establish all GA4 Admin settings, retention or provider-side processing; verify these separately rather than assuming them.

The current contract is [GROWTH-MEASUREMENT](GROWTH-MEASUREMENT.md) and `src/utils/analytics.ts`. Tool starts require trusted workspace interaction. Explicit generated results, artwork opens, export formats, public navigation, copy success, share options, Infooo progress and commercial intent have separate meanings. World starts and guide completions deduplicate only after successful emission. Atlas messages validate same origin, iframe source and fixed public actions. Valid campaign source/medium/name labels are read only after consent and are not persisted by site code. Other landing query values stay excluded. No generic public event sender accepts raw input or result contents.

Withdrawal sets Google's disable flag, clears the site's queue, removes the script element, attempts to delete host GA cookies, then reloads if analytics had loaded to dispose of already-running code. Cookie access restrictions can prevent deletion. Previously sent events are not recalled. Storage failure falls back to a page-local choice; script failure disables further event queuing without affecting tools.

## Deployment validation gate

- Check home, privacy, toolbox, artworks, each representative tool, robots, both sitemaps and public key on HTTPS apex. Recheck HTTPS and www redirects, canonicals and assets.
- With fresh/declined consent, inspect network: no googletagmanager.com or Google Analytics requests. Test a tool and artwork modal.
- Accept: confirm one tag, page_view and safe custom events. Use non-sensitive synthetic sentinels in tool input/query/referrer and inspect every analytics request for absence of those values. Check page_location lacks query/hash, page_referrer is an allowlisted scheme/hostname root or blank, and campaign fields contain only a complete validated public tuple. Check unexpected provider-generated events separately. Keep Enhanced Measurement and user-provided-data collection disabled.
- Confirm no unexpected automatic Enhanced Measurement events. Withdraw consent, observe automatic reload, and verify no further Google requests. Reopen preferences with keyboard.
- Expected Google analytics connections after acceptance are not tool uploads. Any private input in a request is a failure. Recheck live browser requests and GA Realtime after each measurement release. Local tests and an available public ID do not establish GA property receipt or Admin settings.

References: [Google basic consent](https://developers.google.com/tag-platform/security/concepts/consent-mode), [Enhanced Measurement fields](https://support.google.com/analytics/answer/9216061), [IndexNow protocol](https://www.indexnow.org/documentation).


## Continuation configuration gate

Run `npm run audit:ga-config` with the real `PUBLIC_GA_MEASUREMENT_ID` set. This read-only check examines the publicly served Google tag configuration and fails if Enhanced Measurement modules or enabled user-provided-data capabilities remain. Google settings can take time to propagate. It never changes account settings. Format changes require manual review; do not bypass the gate. Continue to verify actual browser requests after deployment.
