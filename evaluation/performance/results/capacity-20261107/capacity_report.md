# Local capacity experiment - actual observations

Read-heavy browsing on 28 listings, same Windows computer for app and load generator, PostgreSQL/local adapters, no AWS. Each run has a 15-second ramp excluded from the analysis and a fixed measurement window. The exact run settings and original raw data are beside this report.

| Simulated users | Runs | All requests/s | Successful requests/s | p95 ms (median run) | Worst HTTP error % | All runs meet targets | Generator peak CPU % | API peak CPU % | DB peak CPU % |
|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 1 | 1/1 | 1.40 | 1.40 | 16.19 | 0.00 | Yes | 1.6 | 0.8 | 5.9 |
| 10 | 1/1 | 15.35 | 15.35 | 13.18 | 0.00 | Yes | 3.9 | 8.2 | 7.3 |
| 25 | 1/1 | 37.55 | 37.55 | 13.02 | 0.00 | Yes | 7.1 | 13.6 | 12.7 |
| 50 | 1/1 | 75.25 | 75.25 | 11.58 | 0.00 | Yes | 9.9 | 18.3 | 13.5 |
| 100 | 1/1 | 150.60 | 150.60 | 14.93 | 0.00 | Yes | 16.1 | 36.4 | 27.1 |
| 200 | 1/1 | 297.75 | 297.75 | 25.67 | 0.00 | Yes | 29.7 | 55.7 | 42.8 |
| 400 | 2/2 | 565.42 | 565.42 | 175.65 | 0.00 | Yes | 55.2 | 104.4 | 96.2 |
| 500 | 2/2 | 643.36 | 620.17 | 356.58 | 4.61 | No | 59.1 | 114.0 | 110.5 |
| 600 | 1/1 | 676.43 | 649.77 | 391.07 | 3.94 | No | 59.2 | 111.2 | 117.5 |
| 800 | 1/1 | 663.12 | 662.17 | 736.49 | 0.14 | No | 57.0 | 106.6 | 118.2 |

Highest tested user count passing all recorded trials: **400**.
Lowest tested count with a failed trial: **500**.

Targets: measured p95 <500 ms, HTTP failure rate <1%, functional checks >99%; full test exit must also pass. Runs are shown as complete/total. Incomplete aborted trials are retained for pass/fail and worst error rate, but excluded from throughput/latency medians. The median of individual run p95 values is explicitly a run-level summary, not a pooled p95.

## Diminishing returns and interpretation

This experiment flags a candidate interval when relative successful-throughput gain is less than half the relative increase in users, p95 grows at least 25%, and the generator remains below 90% of its 2-CPU limit. Failed requests are excluded from successful throughput so fast errors cannot inflate the useful capacity. This is a declared engineering heuristic, not a universal k6 or course rule. Repeat nearby levels before concluding the change is consistent.

Candidate interval(s): 400-500 VUs.

A latency target can fail before throughput visibly flattens. Report that quality limit separately from the throughput knee. CPU above 100% means more than one logical CPU; app/database containers are not limited to one CPU. The generator is capped at 2 CPUs (200%) and 1 GiB. If it approaches 180%, separate-generator testing is needed before attributing a plateau to the app.

These are simultaneous scripted browsing sessions with 1-3 second think time, not registered users or 100% simultaneous HTTP requests. Closed-loop traffic slows as responses slow. A follow-up fixed-arrival-rate experiment can probe incoming demand independently. For production-like capacity conclusions, use a separate generator, a representative larger dataset/mixed workload, longer repeated plateaus and a stated headroom policy.

Raw per-request latency and rates exclude setup/warmup. Resource snapshots are sampled about every 5-7 seconds, include warmup, and can miss brief peaks. All runs, including failed/aborted trials, remain in the results directory. Short tests do not establish sustained capacity, uptime or cloud superiority.

Official references: [k6 workload models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/), [API load testing](https://grafana.com/docs/k6/latest/testing-guides/api-load-testing/), [generator limits](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/), [thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).
