# Browser performance evaluation

Completed by Carlo on 7 November 2026. This report records the three Lighthouse outputs pasted into the conversation, including Carlo's correction that run 3 scored94. The original exported Lighthouse HTML/JSON and tested URL were not supplied in those excerpts; no additional run was performed to create this summary.

The tests ran in desktop Chrome DevTools but used **mobile emulation**, not the Lighthouse Desktop profile: emulated Moto G Power, Slow 4G, Lighthouse 13.5.0 and Chromium 157.0.0.0. Report as “mobile-emulated browser performance measured through desktop Chrome”. This browser evaluation is complete; a separate desktop-profile or cloud-versus-local browser comparison was not established by these excerpts.

| Metric | Run 1, 15:38 SGT | Run 2, 15:41 SGT | Run 3, 15:42 SGT | Median |
|---|---:|---:|---:|---:|
| Performance score |95|94|94|94|
| First Contentful Paint,seconds |1.8|1.9|1.9|1.9|
| Largest Contentful Paint,seconds |1.8|2.0|2.0|2.0|
| Total Blocking Time,ms |0|0|0|0|
| Cumulative Layout Shift |0.115|0.115|0.115|0.115|
| Speed Index,seconds |1.8|1.9|1.9|1.9|

All runs met the proposed Lighthouse score target of 90 or above. The scores differ slightly across runs, as expected for lab measurements. The reports flagged layout shifts, render-blocking requests and unused JavaScript. Do not claim every individual web-vital target passed solely because the overall score was94. Results describe initial-page-load lab performance, not API concurrency, actual-user field performance, uptime or proof of usability.

Report wording: “We ran three Lighthouse mobile-emulated page-load tests through Chrome DevTools. Performance scores were 95, 94 and 94, with a median of 94. Median First Contentful Paint was 1.9 seconds, Largest Contentful Paint was 2.0 seconds, Total Blocking Time was 0 ms and Cumulative Layout Shift was 0.115. All three overall scores exceeded our target of 90.”

Method reference: [Lighthouse scoring, variability and mobile/desktop profiles](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). Measurement source is Carlo's pasted outputs, not this reference page.
