# Investigation of the AWS 500-user results

**9 November update:** [AWS monitoring exports are now reviewed](aws_monitoring_findings.md). They show no observed scale-out, one healthy target throughout, and high CPU-credit balances. Credit depletion is no longer supported as an explanation. The hypotheses below describe the earlier pre-export investigation; exact latency cause remains unresolved.

8 November 2026. Passive analysis of saved raw k6 metrics, logs, generator resource samples and the reviewed repository. No additional load was generated, and no application or cloud configuration was changed. Endpoint/phase summaries are in `latency_investigation.json`; `../../investigate_cloud.py` reproduces them.

## What failed, exactly?

The application did not enforce a 500-user access limit. In the completed repeat, all 37,336 measured HTTP responses were200, checked assertions passed, median request duration was16.30ms, successful throughput was622.27req/s, and p95 was760.47ms. The test failed its **p95 <500ms** quality criterion. Roughly7.75% of measured responses exceeded500ms. This is a slow tail, not a total service outage or a demonstrated fixed user ceiling.

The repository `loadtest/k6.js` defaults `P95_MS` to800ms. The evaluation wrappers deliberately use500ms, following the previously adopted project target and local baseline. The completed repeat would meet an800ms p95 criterion, but the original aborted500 attempt would not. Changing the target after observing results would change the evaluation question; keep500ms for the existing comparison and disclose the distinction.

400 is the highest cloud level that passed in the initial sweep, with one trial. It is not confirmed sustained production capacity. Cloud600/800 were not attempted after failed500 levels. On-prem failed500 for HTTP errors, so similar user-count boundaries do not prove a shared bottleneck.

## Timing evidence

Complete500 repeat,60-second measurement:

| Metric | Median ms | p95 ms | Interpretation |
|---|---:|---:|---|
| HTTP request duration |16.30|760.47|Measured latency target failed|
| Waiting for response / first byte |16.24|760.42|Dominates measured request duration|
| Request blocking / acquiring connection |about0|about0.01|No broad client-side connection wait in this repeat|
| TCP connecting |0|0|Most connections reused; maximum24.75ms|
| Receiving response body |0.04|0.09|Body transfer does not explain the long tail|

Waiting includes network and load-balancer/server/database delays; it is not a direct database query timer. These values narrow the investigation but cannot identify one server-side component by themselves.

Endpoint p95: search1,172.30ms, detail545.70ms, facets495.47ms. Search accounted for1,496 of the2,895 responses slower than500ms. Different request ordering and completion times also affect these endpoint distributions; higher search latency is evidence to investigate the search path, not proof of a defective SQL query.

Completion-time bins show uneven behavior: the repeat's35–40s bin had p95about3,141.97ms, while45–50s was32.71ms and55–60s was25.49ms. These are completion-time windows, not exact request-arrival windows. The slowdowns are intermittent rather than uniform across the entire minute. The first aborted500 attempt additionally had some TCP connections taking up to7.08seconds. That connection issue was absent in the completed repeat, so the two runs may reflect different transient conditions.

Generator peakCPU was34.93% in Docker units against a200% two-CPU allocation; minimum free host memory was3.93GiB. No monitored generator resource ceiling was reached. This makes generator CPU/RAM saturation less supported, but cannot rule out unsampled brief events, internet effects or remote resource pressure.

## Architecture and configuration hypotheses

These are candidates, not confirmed diagnoses. Repository defaults may differ from deployed settings.

1. **Database/pool queueing.** `api/src/config.js` sets `PGPOOL_MAX` default10 per Node process. `db.js` uses node-postgres pooling. The browse cycle performs approximately seven SQL queries across three HTTP requests: search1, facets2, unauthenticated detail4. The repeat's622.27HTTPreq/s therefore corresponds to roughly1,452SQLqueries/s, assuming the observed full-cycle mix. There is no application-level response cache on these routes. If connections or database CPU become busy, pool requests can queue and increase latency. Ten connections do not imply a ten-user limit, and merely increasing the pool can overload the database.
2. **Small compute/database resources.** Terraform defaults EC2t4g.micro and RDSdb.t4g.micro, with a shared database behind all API instances. API scale-out cannot remove a database bottleneck. The Node API and worker share each EC2 host, but the read-only test does not create notification jobs. No evidence demonstrates that worker traffic caused this event.
3. **Burst CPU credits.** EC2 source uses Standard credit mode. Low CPU credit balance can gradually restrict a burstable instance to its baseline. This is **CPU capacity accounting**, distinct from USD100 promotional billing credits. Credit depletion is plausible only if the applied instance type/mode and metrics support it; no CPUCreditBalance series is currently available. RDS burstable CPU behavior is a separate check.
4. **Scaling response versus short bursts.** Source scales on averageEC2CPU50%, with min1/max3 and basic EC2 monitoring rather than detailed monitoring. Five-minute CPU data and instance boot/health-check warmup can respond too slowly to a15-second ramp plus60-second hold. CPU target tracking may also not respond to database/network-bound queueing when appCPU stays below its target. We did not measure instance counts or scale events, so do not claim that scale-out failed or succeeded. The300-second health-check grace period in source is not proof that all launches take300seconds.
5. **Transient network, database or instance state.** First aborted trial and repeat differ substantially; the400-user run also had a brief initial latency burst before settling. Cache state, credit balance, connection bursts, garbage collection, instance changes and network conditions remain candidates. They cannot be distinguished without aligned server/account telemetry.

## Is this caused by the AWS payment plan?

There is no evidence of a Free Tier or promotional-credit rule limiting the app to500 concurrent users. Promotional dollars offset eligible charges; this is different from the resource sizes selected, CPU burst credits, account service eligibility and quotas. Account plans/quotas can affect which services or how much capacity may be provisioned, but cannot be inferred from this HTTP latency pattern. No429/503 responses or account quota errors were observed in the completed repeat. Check actual quota/scaling activity if an instance launch failed; do not attribute the latency to the account plan without that evidence.

Paying for larger instances or configuring scaling may improve available capacity, but spending credits differently is not itself a technical fix. Increasing compute alone would not solve a database or application queueing bottleneck. No upgrade is recommended as a confirmed remedy by this investigation.

## Evidence that would confirm a cause

Align the two500 windows,20:44:40–20:45:18 and21:21:30–21:22:49SGT, with the400 window20:29:40–20:31:04 on8November. Useful checks:

* EC2CPU high plus lowCPU credits: supports compute/credit pressure; distinguish the two.
* ASG activity/healthy-target changes around spikes: supports a capacity-transition explanation. Record starting counts and actual configuration.
* RDSCPU/memory/connections, database load/waits if already available, and API/query timings: distinguish database work from waiting for a pool connection. Existing logs may help; pool waiting counters were not collected.
* ALBTargetResponseTime rising alongside k6wait: supports a target-side delay. If ALBtiming stays low while k6wait rises, investigate the external network/front path. Metrics with different aggregation periods are not one-to-one matches.
* Application restarts/errors/GC pauses and event-loop delay if already instrumented: support process-level explanations. They were not measured by k6.

The report can currently conclude **tail-latency degradation at500 users under the tested configuration**, with design/sizing/scaling candidates documented. It cannot establish a single root cause or an AWS plan-imposed user cap.

Primary references: [node-postgres pool behavior](https://node-postgres.com/apis/pool), [AWS Standard CPU-credit mode](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-standard-mode.html), [target tracking and metric resolution](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html), [AWS Free Tier account/credit description](https://aws.amazon.com/free/). Source evidence: `api/src/config.js`, `api/src/db.js`, `api/src/routes/businesses.js`, `infra/variables.tf`, `infra/compute.tf` at the reviewed local revision. No cloud credentials were used.
