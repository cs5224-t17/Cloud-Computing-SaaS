# AWS monitoring export — load tests of 8 Nov 2026

Window: **18:49–21:43 SGT (UTC+8)** on 8 Nov 2026 = 10:49–13:43 UTC. Region ap-southeast-1.
Exported from CloudWatch with `export.py` (same data as the console's *Download as CSV*). Each graph has a `.csv` (one row per minute, times in SGT) and a `.png` with the four test starts marked: 18:59, 20:29 (400 VU), 20:44 (500 VU #1), 21:21 (500 VU #2).

| File | Metrics |
|---|---|
| `ec2_cpu` | EC2 CPUUtilization: ASG average, ASG maximum, per instance |
| `ec2_cpu_credits` | CPUCreditBalance, CPUCreditUsage |
| `alb_requests` | RequestCount (per minute) |
| `alb_response_time` | TargetResponseTime p50 / p95 / p99 / average (seconds) |
| `alb_errors` | Target 5XX, ELB 5XX/502/503/504, Target 4XX, TargetConnectionErrorCount, RejectedConnectionCount |
| `alb_connections` | ActiveConnectionCount, NewConnectionCount |
| `instance_count` | HealthyHostCount / UnHealthyHostCount (number of in-service API instances) |
| `rds_cpu`, `rds_connections`, `rds_memory`, `rds_cpu_credits` | RDS CPUUtilization, DatabaseConnections, FreeableMemory (MiB), CPUCreditBalance |
| `asg_scaling_activity.csv` | Every Auto Scaling activity on record (none during the window) |
| `infra_config.json` | Instance sizes, ASG min/max and scaling policy, RDS config |
| `cost_by_service.csv`, `cost_daily_nov.csv` | Cost Explorer, USD, unblended |

## Configuration during the tests

- API: 1 × **t4g.micro** (2 vCPU burstable, 1 GiB, arm64), CPU credits *standard*.
- Auto Scaling group: **min 1, max 3**, target tracking on **average CPU 50%**, 300 s warm-up/cooldown, ELB health checks.
- Database: **db.t4g.micro** PostgreSQL 16.13, 20 GB gp3, single-AZ.
- ALB health check `/api/health` every 15 s.

## What the data shows

Peak values per test, from the CSVs:

| Test (start SGT) | Peak requests/min (ALB) | Peak p95 / p99 latency | Peak EC2 CPU (5-min max) | Peak RDS CPU | 5XX errors at ALB |
|---|---|---|---|---|---|
| 18:59 (ramp series up to ~20:15) | 16,162 | 70 ms / 403 ms | 14.7% | 17.5% | 0 |
| 20:29 — 400 VU | 32,907 (~548 req/s) | 75 ms / 953 ms | 27.0% | 29.9% | 0 |
| 20:44 — 500 VU #1 | 8,035 | 198 ms / 916 ms | 33.4% | 13.3% | 0 |
| 21:21 — 500 VU #2 | 26,738 | 288 ms / 1,004 ms | 33.4%* | 29.4% | 0 |

\*5-minute datapoint spanning 21:20–21:25.

- **The Auto Scaling group never scaled out.** There were no scaling activities in the window, and `HealthyHostCount` stayed at 1 throughout. CPU never got near the 50% target. EC2 basic monitoring reports 5-minute averages, and each test ran for about 75 s, so even the peaks are diluted in the average the policy reads. Target tracking also needs several consecutive breaching datapoints. Demonstrating scale-out needs a sustained test (≥ 10–15 min above the threshold), or a lower target / detailed monitoring.
- **No server-side errors.** The ALB recorded zero 5XX responses, zero target connection errors and zero rejected connections. The only errors were a few 4XX responses (≤ 4/min). Any errors k6 reported at 500 VU therefore happened outside AWS, e.g. load-generator limits, client timeouts or the network path. Compare the k6 error types.
- **500 VU #1 sent far fewer requests** (8,035/min peak vs 32,907 at 400 VU), so that run likely did not reach full load. Check its k6 log.
- **No CPU-credit throttling.** The EC2 credit balance stayed at its 288 maximum and RDS credits stayed full.
- RDS used at most 10 connections and kept ~225 MiB freeable memory at peak.

## Cost (redacted: no account identifiers)

- **8 Nov total: USD 1.69**, almost all fixed hourly charges: ALB 0.52, RDS instance 0.52, public IPv4 0.31, EC2 0.21, storage 0.12. The load tests' variable cost (ALB capacity units) was **USD 0.0016**.
- Steady state is about **USD 1.7/day before tax (~USD 51/month, ~USD 55 with 9% GST)** for this stack.
- October and 1–7 November also include an unrelated `t2.medium` instance ("lab2", ~USD 1.4/day) that ran in this account from 20 Oct to 7 Nov. **Exclude it** from project cost; the drop from 2.67/day to ~1.7/day after it was stopped shows its share.
- Billing for 8 Nov may still change slightly as Cost Explorer finalises (up to ~24 h lag).

## Not available

- **ASG instance-count graph:** ASG group metrics collection was not enabled, so `instance_count` (ALB healthy hosts) is the substitute.
- **Console screenshots:** the PNGs here are drawn from the exported data, with metric names and a labeled SGT time axis. Take console screenshots by hand if the report needs them specifically.
