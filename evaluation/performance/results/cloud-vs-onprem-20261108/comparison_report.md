# Cloud versus on-prem performance evaluation

Prepared 8 November 2026 from 12 on-prem runs and nine cloud attempts. Original measurements and source files remain unchanged. The table combines matching concurrency levels; it does not pool the two environments into a single average.

**Main finding:** both environments passed through 400 concurrent scripted browsing users. On-prem 400 passed twice; cloud 400 passed once. Both environments failed at 500, for different reasons: on-prem exceeded the HTTP error target; AWS exceeded the latency target. This indicates a workload-specific quality boundary around 400–500, not a sustained production capacity guarantee or proof of equal hardware capacity.

## Matched results

Latency and successful throughput below use only complete measurement windows. On-prem 400 and 500 values are medians across two runs; other completed levels have one run. Error columns show the worst recorded trial at that level. “Not tested” is not a zero or a failure.

| Users | On-prem p95 ms | AWS p95 ms | On-prem successful req/s | AWS successful req/s | On-prem HTTP error % (worst) | AWS HTTP error % (worst) | On-prem / AWS status |
|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 16.19 | 23.25 | 1.40 | 1.50 | 0.00 | 0.00 | Pass / Pass |
| 10 | 13.18 | 79.65 | 15.35 | 14.95 | 0.00 | 0.00 | Pass / Pass |
| 25 | 13.02 | 41.51 | 37.55 | 36.25 | 0.00 | 0.00 | Pass / Pass |
| 50 | 11.58 | 37.71 | 75.25 | 75.25 | 0.00 | 0.00 | Pass / Pass |
| 100 | 14.93 | 81.11 | 150.60 | 148.20 | 0.00 | 0.00 | Pass / Pass |
| 200 | 25.67 | 140.24 | 297.75 | 293.50 | 0.00 | 0.00 | Pass / Pass |
| 400 | 175.65 | 33.72 | 565.42 | 594.80 | 0.00 | 0.00 | Pass / Pass |
| 500 | 356.58 | 760.47 | 620.17 | 622.27 | 4.61 | 0.00 | Fail / Fail |
| 600 | 391.07 | Not tested | 649.77 | Not tested | 3.94 | Not tested | Fail / Not tested |
| 800 | 736.49 | Not tested | 662.17 | Not tested | 0.14 | Not tested | Fail / Not tested |

Targets: measured p95 <500 ms; HTTP failures <1%; checked assertions >99%; run must pass thresholds. A run may complete the full measurement but still exit with a failed threshold.

## Interpretation

* AWS successful throughput increased from 594.80 req/s at 400 VUs to 622.27 req/s in the completed 500-VU repeat, a gain of 4.6% for 25% more users. Its p95 increased from 33.72 to 760.47 ms. This supports diminishing returns between these points in this experiment, but differing instance counts/cache/credit states are unverified.
* On-prem successful throughput increased from a median 565.43 to 620.17 req/s, a gain of 9.7%. Median run p95 rose from 175.65 to 356.58 ms; both 500-VU trials failed because HTTP errors were 4.61% and 2.60%.
* At 400 VUs the AWS run had lower p95 and approximately 5.2% higher successful throughput than the local run median. This single cloud trial does not establish general cloud superiority. At several lower levels local p95 was lower, and the cloud p95 is not monotonic across levels.
* The first AWS 500-VU attempt was aborted by the p95 protective threshold. Its observed measurement span was about 17.73 seconds, with partial-window p95 3,836.06 ms and 0% observed HTTP errors. It is retained as a failed attempt but excluded from the table’s comparable latency/throughput. Its original analysis divided partial request counts by the planned 60 seconds; that 134.95 req/s figure must not be used as a completed-run throughput result.
* The second AWS 500-VU run completed its 60-second measurement: p95 760.47 ms, p99 2,422.32 ms, 622.27 successful req/s and 0% HTTP errors. It still failed p95 <500 ms, so no cloud 600/800 tests were started. Do not describe them as failed cloud tests.
* Generator peak CPU in the completed cloud 500-VU repeat was 34.93% in Docker units, well below its two-CPU allocation; minimum host free RAM was approximately 3.93 GiB. This does not identify the remote bottleneck or rule out network effects.

## Methods and comparability

Both use the unchanged team browse/setup functions, grafana/k6:0.55.0 with matching image digest, 15-second ramp excluded from analysis, fixed 60-second measurement, search/facets/listing-detail GETs, and 1–3 second think time. Both generators were capped at two CPUs and 1 GiB. Setup discovers search terms from each deployment’s category facets. Counts refer to active scripted sessions, not monthly users or a fixed arrival rate.

On-prem ran on 7 November on the LG 16Z90TS-G.AU76A3 laptop: Intel Core Ultra 7 256V, eight cores/eight threads, 16 GiB installed RAM. Docker shared eight CPUs and about 7.54 GiB with the application and generator. Stack: Nginx, API, PostgreSQL, worker, Mailpit and local media. Local source commit: 3783f647f96b433d316bc6d21f9a4e450d4fd4b5. See the original hardware findings for full details.

Cloud ran on 8 November from the same laptop to the public Singapore HTTP ALB. API preflight reported 28 listings, matching the local count, but full row equivalence and the cloud deployed commit remain unverified. Subsequent AWS exports identify t4g.micro / db.t4g.micro, one healthy target throughout the window, high CPU-credit balances and no recorded scale-out. See aws_monitoring_findings.md for independently checked values and limitations. This test path does not measure browser rendering or the complete CloudFront/S3 frontend path.

Cloud starts were separated by 15 minutes; local recovery used a proxy-socket baseline and shorter intervals. Cache state, CPU credits and autoscaling state were not controlled equally. The cloud app does not share the laptop with its generator; the local app does. Internet versus same-host network paths and different infrastructure prevent a controlled equal-hardware claim. Repeated AWS 400-VU confirmation and longer plateaus would strengthen the result, but are not included here.

HTTP duration is the k6 request duration metric, not full end-user page load or all connection-establishment time. Zero HTTP errors does not guarantee every feature works; the browse workload checks search/detail responses but not all facets responses. No owner updates, queue/email capacity, writes, uploads, long-term uptime or production user capacity were evaluated.

## AWS evidence handoff

All times below are Singapore time (UTC+8), 8 November 2026. Export metrics as CSV plus screenshots with labels, units, statistic, period and timezone. Preserve missing datapoints as missing.

| Cloud VUs | Started | Finished | Outcome |
|---:|---|---|---|
| 1 | 18:59:40 | 19:00:58 | Passed |
| 10 | 19:14:40 | 19:15:59 | Passed |
| 25 | 19:29:40 | 19:31:04 | Passed |
| 50 | 19:44:41 | 19:46:04 | Passed |
| 100 | 19:59:40 | 20:01:03 | Passed |
| 200 | 20:14:40 | 20:16:04 | Passed |
| 400 | 20:29:40 | 20:31:04 | Passed |
| 500 | 20:44:40 | 20:45:18 | Latency abort; partial window |
| 500 | 21:21:30 | 21:22:49 | Latency failure; full window |

Suggested absolute export window: 18:49–21:43 SGT (10:49–13:43 UTC), extending further if observing scale-in. Capture EC2 CPU/credits/health, ALB request/5xx counts and response times, RDS CPU/connections/memory/credits, ASG desired/in-service counts and Activity history. Confirm the applied resource settings and any deployment, restart or scale event. Metrics may be exported after they arrive; do not interpret a missing ASG series as no scaling.

Basic EC2 monitoring in source is five-minute resolution; ALB metrics are reported at one-minute intervals during traffic. Record the applied settings. A short spike may be smoothed out in CPU data. Autoscaling has not been demonstrated by the k6 results alone. The separately proposed 15-minute hold was not executed.

## Report-ready paragraph

We compared the local Docker deployment with the AWS deployment using the same read-only k6 browsing workload and matching concurrency levels. Both environments passed the project targets through 400 concurrent scripted users. At 400 users, the local median successful throughput was 565.43 requests per second with a median run-level p95 of 175.65 ms, while the single AWS run achieved 594.80 requests per second with p95 of 33.72 ms. At 500 users, both environments failed, but for different reasons. The local deployment exceeded the HTTP error target in both trials, while the completed AWS repeat recorded no HTTP errors but exceeded the latency target with p95 of 760.47 ms. An earlier AWS 500-user attempt was aborted and excluded from full-window throughput comparisons. These results suggest an observed quality boundary between 400 and 500 users for this workload. They do not establish sustained production capacity or prove autoscaling, since hardware, network paths, recovery intervals and instance state differed or were unverified.

## Remaining evaluation work

* AWS monitoring and resource exports have been received and reviewed; incorporate aws_monitoring_findings.md without claiming a confirmed latency root cause or successful scale-out.
* Collect and analyse the actual survey responses, expected Tuesday 10 November. Separate seller needs research from customer task feedback/SUS. Label timing/task completion as self-reported when applicable; report actual response counts and missing data.
* Complete on-prem monetary/power assumptions, validate cloud sizing/costs, and keep credits separate from gross hosting cost. Do not infer cost per request from equal-capacity assumptions.
* Browser evaluation is completed: Lighthouse scores 95, 94 and 94 (median 94), using mobile emulation through desktop Chrome. See ../../lighthouse_report.md. The tested URL was not included in the pasted excerpts; a cloud-versus-local browser comparison is not established.
* Draft methods, completed findings, tables, cost assumptions and slides now. Add survey analysis and verified AWS explanations when evidence arrives. Final report and slide submission deadline from the supplied brief is 13 November 2026 at 23:59; presentation and peer assessment remain team responsibilities.

Sources: [local findings](../capacity-20261107/findings.md), [first cloud sweep](../cloud-20261108T105940104979Z/), [cloud confirmation](../cloud-20261108T132130479091Z/). The accompanying JSON contains every run and source analysis-file hashes. No raw records were changed.
