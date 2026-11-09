# AWS monitoring evidence and revised interpretation

Reviewed 9 November 2026. Source: teammate's exports under `Cloud-Computing-SaaS/loadtest/aws-2026-11-08`, main commit `64a03d7741e9779c799a36014c544ff21fb89651`. The 29 source files were archived under `evaluation/aws_evidence/aws-2026-11-08/` with file hashes. Analysis used the CSVs and configuration, not just the README. No AWS credentials, infrastructure changes or extra load tests were used.

## Confirmed deployment and observed scaling

The exported snapshot identifies EC2 t4g.micro in Standard CPU-credit mode, RDS db.t4g.micro PostgreSQL 16.13 with 20 GB gp3 and Single-AZ, and an ASG min 1/max 3 with average CPU target 50%. This is broadly consistent with the planned architecture, while the local database used PostgreSQL 16.15. The deployed application commit remains unrecorded in the supplied inventory.

During 18:49–21:43 SGT on 8 November:

| Evidence | Independently checked result |
|---|---|
| Healthy API target count |1 at all 174 exported minute timestamps|
| Unhealthy target count |0 throughout exported points|
| ASG activities in test window |None; saved activities were on 7 November|
| ASG group metric collection |Disabled; ALB healthy-target series is the available substitute|
| Highest five-minute Average CPU point |9.6294%|
| Highest Maximum-statistic CPU point |33.4%|
| EC2 CPU-credit balance |273.9836–288 credits|
| RDS CPU-credit balance |287.588–288 credits|
| Peak RDS CPU |29.8648%|
| Peak RDS database connections |10|
| Minimum RDS freeable memory |178.8516 MiB|

**No scale-out was observed.** The Average CPU metric used by the policy stayed below the 50% target at exported resolution. The 33.4% Maximum statistic is a different statistic and must not be described as the policy's observed average. Basic EC2 metrics are five-minute data, so brief CPU spikes are smoothed; these exports cannot prove that instantaneous CPU never crossed 50%. The one-minute hold is an evaluation-method limitation for demonstrating elasticity, not proof the architecture has no scaling capability.

CPU-credit depletion is not supported: both EC2 and RDS credit balances stayed far above zero. Earlier investigation listed it as a hypothesis; this new evidence makes it an unsupported explanation for these trials. Promotional billing credits are unrelated to CPU-credit balances.

## What this says about the 500-user latency failure

The completed 500 repeat still failed the original client-facing p95<500 ms target: k6 p95 was 760.47 ms, throughput 622.27 successfulreq/s and HTTP errors 0%. The initial attempt aborted early. These remain valid observations of this laptop-to-ALB workload; they do not show an AWS payment-plan-imposed user cap.

The source ALB one-minute p95 series peaked at 288.3 ms during the repeat, versus k6's full-run p95 of 760.47 ms. The initial 500 attempt's ALB minute p95 peaked at 198.3 ms, while the partial k6 p95 was 3,836.06 ms. ALB TargetResponseTime and k6 duration cover different timing boundaries and request populations; a maximum of minute percentiles is not a pooled full-run percentile. **Do not subtract these values or interpret the difference as an exact network delay.** The mismatch makes blanket claims that EC2 or RDS was saturated especially weak and warrants examining end-to-end path effects, timing/aggregation and transient behavior.

RDS reached 10 connections, matching the source API pool default. This can motivate a pool-wait investigation, but connection count alone does not prove pool queueing, database saturation or that a larger pool would improve performance. CPU/memory data does not identify a sustained server-resource ceiling. No query-wait, event-loop-delay or request-correlated server timing was exported.

The ALB error export contains a 4 XX series totaling 17 responses across the whole window, but no nonempty 5 XX/target-connection-error/rejected-connection series. The exporter drops empty series; report this as **no reported nonempty 5 XX series**, not an explicit minute-by-minute zero dataset. k6 already recorded zero HTTP errors in both 500 attempts. The teammate README's phrase “errors k6 reported therefore happened outsideAWS” should not be copied: the failure was latency, not HTTP errors, and missing ALB error series cannot localise a latency cause.

The earlier README also says credits stayed at the maximum and freeable memory was about 225 MiB. The CSVs instead show the ranges/minimum above. These differences do not change the central conclusion, but the report uses the directly computed CSV statistics.

## Cost evidence

`cost_daily_nov.csv` records USD 1.69 on 8 November. At constant use,1.69×730/24 gives USD 51.40 per 730-hour planning month, not a verified monthly bill. Its tax/credit inclusion is not fully documented. November service rows sum USD 21.67; daily rows sum USD 21.69. The small USD 0.02 discrepancy may be rounding, filters or update timing. The source README identifies an unrelated t 2.medium lab instance on earlier dates, so do not allocate mixed-account November/October totals to this app.

The README's USD 0.0016 extra load-test cost has no corresponding detailed usage/cost line in the supplied CSVs and is not independently verifiable here. The gross architecture estimate of USD 65.49/month remains a separate before-allowance planning model. Billing snapshots and credit-covered cash payments must not be substituted for the underlying cost of providing the service.

## Report-ready conclusion

AWS monitoring showed one healthy application target throughout the exported test window and no recorded scaling activity. The highest five-minute Average CPU datapoint was 9.63%, below the 50% scaling target. CPU-credit balances remained high, so CPU-credit exhaustion does not explain the observed latency failures. The completed 500-user repeat nevertheless exceeded the end-to-end latency target. These results show a client-facing response-time limitation for the tested workload, but do not establish the application's maximum server capacity or a single root cause. A longer controlled test would be required to demonstrate elasticity; no successful autoscaling demonstration is claimed.

Reproduction: `evaluation/cost/analyze_exported_evidence.py` produces `aws_export_analysis.json`, including independent minima/maxima and minute-window selections. Original exports and original k6 measurements remain unchanged.
