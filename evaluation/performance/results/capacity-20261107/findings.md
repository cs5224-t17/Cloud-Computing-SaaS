# What the local capacity tests establish

7 November 2026. Twelve real runs at ten distinct concurrency levels, up to 800 simulated users. The 400- and 500-user levels were each tested twice. The original application source and infrastructure configuration were not changed. All requests targeted the local read-only browsing path; AWS was not tested.

## Main result

The observed transition is **400-500 simultaneous scripted browsing users** for this deployment and workload. Both 400-user trials passed p95 <500 ms, HTTP errors <1% and checks >99%. Both independent 500-user trials failed on HTTP errors: **4.61% and 2.60%**, despite p95 values of **342 and 371 ms**. This is why latency alone is insufficient.

At 400 users, median successful throughput across the two runs was **565.42 requests/s**. At 500 it was **620.17 requests/s**: **25% more users yielded only about 9.7% more successful requests/s**. Median run-level p95 increased from **175.65 to 356.58 ms**, approximately doubling. Successful throughput then flattened to about 650-662 requests/s at 600-800 users, with failed targets. These counts establish an observed bracket, not an exact threshold such as 437 users.

400 is the highest **tested** concurrency that consistently passed the short runs. It is not a guarantee of sustained 400-user service. If choosing a provisional operating budget, leave headroom below the observed boundary and validate that chosen load with longer independent repeats. The 100/200-user tests are useful normal/moderate reference points; 400 is a stress reference and 500+ an overload reference for this baseline.

## Laptop hardware and test environment

The application and the simulated users ran on the **same laptop**. Hardware was checked directly through Windows system information on 7 November 2026. CPU, usable host memory and Docker limits also match the metadata saved during the capacity tests.

| Component | Verified specification |
|---|---|
| Manufacturer and model | LG Electronics **16Z90TS-G.AU76A3** |
| Processor | **Intel Core Ultra 7 256V** |
| CPU cores and threads | **8 physical cores, 8 logical processors** |
| Installed RAM | **16 GiB** total reported by the memory devices; approximately **15.57 GiB usable by Windows** |
| Storage | **Samsung MZVL2512HDJD-00B07 NVMe SSD**, approximately **512.1 GB** physical capacity (decimal units) |
| Graphics | **Intel Arc 140V**; GPU acceleration was not used by the HTTP browsing workload |
| Host operating system | **Windows 11 Home, 64-bit**, version 10.0.26200, build 26200 |

Docker runs Linux containers inside a WSL 2 virtual machine. Its resource limits are different from the laptop's physical specifications:

| Test component | Configuration |
|---|---|
| Docker engine | **29.9.2**, Linux x86_64 |
| WSL Linux kernel | **6.18.54.1-microsoft-standard-WSL2** |
| CPUs visible to Docker | **8 logical CPUs**, shared by the containers |
| Memory visible to Docker | Approximately **7.54 GiB**, shared by the containers |
| k6 load-generator container | **grafana/k6:0.55.0**, limited to **2 CPU cores and 1 GiB RAM** within the shared Docker environment |
| Application containers | Nginx frontend/proxy, Node.js API, notification worker, PostgreSQL and Mailpit; the Compose file sets no separate CPU or memory limits for these services |
| Application runtime | **Node.js 22.23.4** in the API container |
| Database runtime | **PostgreSQL 16.15** |
| Network path | k6 container → `host.docker.internal:8080` → Nginx → API → PostgreSQL, all on the same laptop |

The 2-CPU/1-GiB generator limit is part of Docker's shared resources, not extra hardware. The application did not have eight dedicated cores or the full 16 GiB of host RAM reserved for it. Windows, other desktop apps, Docker and the test generator all shared the laptop. This setup is a **local prototype baseline**, not a dedicated on-premises production server. Hardware, network and resource-allocation differences must be stated when comparing it with AWS.

Evidence sources: Windows `Win32_ComputerSystem`, `Win32_Processor`, `Win32_PhysicalMemory`, `Win32_OperatingSystem`, `Win32_VideoController` and `Get-PhysicalDisk`; Docker `info`; and the per-run `.summary.metadata.json` files, especially the `client`, `engine` and `load_generator_limits` fields. Hardware details collected after the tests supplement the original run records; those records were not rewritten.

## Failure evidence and implementation-owner handoff

The preserved `high-load-web-api.log` contains Nginx critical errors: upstream connection creation failed with OS error 99 (Address not available), followed by 502 responses. The API container had **zero restarts**, was not OOM-killed and recovered to healthy without configuration changes.

`post-load-network-snapshot.json` records the proxy's ephemeral port range as 32768-60999 (28,232 possible ports). `connection-diagnostics.json` records about **28,240 TIME_WAIT sockets** at the peaks of both 500-user trials. Counts include connections to other destinations; they are not a one-to-one proof of occupancy for one upstream tuple. Together with the explicit upstream errors, this is consistent with temporary local port exhaustion/connection churn. It does not prove that PostgreSQL alone is the bottleneck.

The repository Nginx 1.27 configuration proxies directly to `api:3000` without an upstream keepalive pool. Ricco should review reusable upstream connections and HTTP settings, then repeat the same tests in a clearly labeled comparison. [Official Nginx keepalive documentation](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive) describes connection reuse and associated proxy requirements. No connection-pool tuning, kernel TCP changes, app scaling, dependency fixes or AWS services were added during these tests. A proposed fix has not been measured and must not be described as proven.

The confirmation runner was extended after the exploratory progression to wait for proxy sockets to drain before each run (TIME_WAIT <=1000, ESTABLISHED <=50, maximum recovery wait 90s). It recorded TCP states during confirmations. Early exploratory runs remain in the evidence and may include preceding-load effects. The `post-800vu-db-activity-snapshot.txt` was captured after that test completed; it must not be cited as an under-load DB snapshot.

## Generator and measurement limitations

The load generator was limited to 2 vCPUs/1 GiB and never exceeded about **59.2% CPU in Docker's units** (roughly 0.59 of a core, far below its 200% limit). Host available RAM remained above about **2.28 GiB** during actual runs. These observations do not suggest a saturated generator, but a separate generator machine is still preferable for stronger capacity claims.

The dataset has only 28 listings; all traffic is search/facets/detail GET requests with 1-3 second think time. No sign-up, claims, owner writes, photos, emails or real browser rendering were load-tested. The same laptop hosts the generator and app. Each run includes 15 seconds of ramping and a separate 60-second measured scenario. Starting the measured scenario introduces a fresh wave of browsing sessions; no extra transition samples were discarded. Other desktop activity was not controlled; repeat variation at 400 users was material (p95 119-233 ms). These are short exploratory tests, not long-term capacity, uptime or production/AWS evidence.

The first one-user run overlapped installation of isolated plotting dependencies on the host; it is a rough reference rather than a carefully isolated baseline. The critical 400/500 confirmation runs occurred after that installation completed. Graph/report summaries use medians of individual run-level values, not pooled p95. Raw JSONL permits endpoint/time-window reanalysis.

## Reproduce and interpret

Use `../../capacity_sweep.py` from the workspace with `--levels <VU levels>` and a label. It contains local-only URL restrictions, health checks, memory safeguards and latency/error abort thresholds. All run commands, image/version, dataset hash, memory/CPU limits, times and exit codes are in individual `.summary.metadata.json` files. Rebuild the report with `python evaluation/performance/capacity_report.py evaluation/performance/results/capacity-20261107`.

See `capacity_report.md`, `capacity_curve.csv`, `capacity_curve.png` and `capacity_curve.svg` for the full table and plots. Failed runs were retained. Red chart points fail at least one target, including errors even if their p95 is below 500 ms.

For the next experiment, use longer plateaus/repeats and a separate generator. A fixed-arrival-rate test is a useful follow-up because this closed-loop workload sends traffic more slowly when responses slow; see [k6 open and closed workload models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/). There is no universal best VU count; select levels from observed system behavior and the real intended workload.
