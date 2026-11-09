# Architecture, cost and test consistency review

Update: this is the earlier repository/diagram review. Subsequent AWS exports are now analysed in [monitoring findings](performance/results/cloud-vs-onprem-20261108/aws_monitoring_findings.md). Statements below about then-unverified deployment describe that earlier review.

Reviewed 7 November 2026 against the two diagrams supplied by Carlo, the local running stack, and repository frontend commit `3783f647f96b433d316bc6d21f9a4e450d4fd4b5`. The application clone was not changed. Remote frontend still matched that commit when checked. Main is a separate branch; this review follows the frontend revision used for the experiments.

**Decision: the diagrams describe the repository well enough to use after the wording corrections below. No new capacity test is needed just to make the report match these diagrams.** The AWS diagram describes infrastructure code, not an independently verified inventory of deployed AWS resources.

## Figure 1: AWS

| Diagram component | Repository evidence | Assessment and cost implication |
|---|---|---|
| Singapore VPC, two AZs | `infra/variables.tf`, `infra/network.tf` | Matches. Two public app/ALB subnets and private database subnets; EC2 has public IPs. No NAT gateway. |
| CloudFront and two S3 buckets | `infra/edge.tf` | Matches. Web SPA and media buckets; `/api/*` forwards to ALB without caching. Include a CloudFront Function for SPA paths. |
| ALB and 1–3 t4g.micro ARM64 instances, CPU target 50% | `infra/compute.tf`, `infra/variables.tf` | Matches source defaults. API and worker share each EC2 host: do not buy a separate worker instance in the estimate. Autoscaling behavior has not been measured. |
| PostgreSQL 16, single-AZ RDS | `infra/data.tf` | Matches: db.t4g.micro, 20 GB gp3. A two-AZ VPC does not make the database Multi-AZ. |
| SQS and DLQ, SES | `infra/data.tf`, `api/src/queue.js`, `api/src/worker.js`, `api/src/mailer.js` | Matches. SES sandbox requires verified recipients unless production access is granted. Price email recipients and queue polling, not a dedicated queue server. |
| ECR, SSM, GitHub deployment | `infra/data.tf`, `infra/github_oidc.tf`, `infra/user_data.sh.tftpl`, `.github/workflows/` | Matches source intent. ECR keeps ten images; aggregate stored GB is unknown. Standard SecureString parameters use encryption. |
| CloudWatch and budgets | `infra/observability.tf` | Logs retain 14 days; dashboard and USD15 budget exist in source. Budget is an alert, not a spending cap. Dashboard presence does not prove all ASG metrics are being emitted; group metrics collection is not explicitly enabled. |

Add a caption saying **“Configured AWS architecture from repository; deployed settings require confirmation.”** HTTPS applies to the viewer–CloudFront connection. The configured origin ALB uses HTTP; do not describe the entire path as end-to-end HTTPS.

Costs not drawn as separate boxes still matter: EC2 root EBS, public IPv4 addresses (at least two for ALB plus one per running EC2 instance), cross-AZ EC2–RDS traffic, log ingestion/storage and image storage. The estimate includes these. No NAT gateway, ECS, Route 53 or WAF is defined and none was added to the model.

## Figure 2: on-premises

| Diagram component | Evidence | Assessment |
|---|---|---|
| Single Docker host, Nginx web, one API | `deploy/onprem/docker-compose.yml`, `web/nginx.conf` | Matches actual test path on localhost:8080; no ALB/CDN/autoscaling. |
| PostgreSQL and local media | Compose volumes and runtime inspection | Matches: `hbb-onprem_pgdata`, `hbb-onprem_media`; API mounts `/data/media`. PostgreSQL jobs replace SQS. |
| Worker and PostgreSQL job polling | Compose and `api/src/queue.js`, `api/src/worker.js` | Matches. Runtime drivers are pg / smtp / local and SMTP host is mailpit. |
| Mailpit → follower inbox | Compose contains Mailpit with no external forwarding | **Correct this arrow.** Mailpit captures emails in its test inbox at :8025. It does not deliver them to customers' real inboxes in this setup. |
| `.env` file | Compose `${VAR:-default}` expressions | **Optional, not present in the tested deployment.** Relabel “environment variables / optional .env; test defaults used.” Keep test secrets private and replace defaults before public deployment. |
| Same image as AWS | API Dockerfile and local x86_64 versus AWS ARM64 | Relabel “same application source and Dockerfile; platform-specific image builds.” Do not claim the exact same binary image was used on both architectures. |

Both diagrams should say **“availability and listing-update notifications”** rather than implying implemented stock counts/restock detection. A seller can communicate availability, but the source does not implement a separate inventory model. These are diagram wording corrections; the baseline application does not need changing.

## Does Carlo need to repeat the on-prem tests?

No. The tested stack already has all five diagram services: web, API, worker, PostgreSQL and Mailpit. It used 28 imported listings, the same frontend source revision, local volumes and the PostgreSQL queue. It ran under Docker/WSL2 on Carlo's LG laptop rather than a dedicated Linux server. The architecture caption should identify that actual test environment.

The host has an Intel Core Ultra 7 256V, eight cores/eight threads and 16 GiB installed RAM. Docker shared eight CPUs and approximately 7.54 GiB with all containers. The k6 generator, also on that laptop, was capped at two CPUs and 1 GiB. Full hardware and methods remain in [the original findings](performance/results/capacity-20261107/findings.md).

The 12 runs measured read-only browsing, not all system functions. At 400 concurrent scripted users both repeats passed; 500 failed on errors. This is a workload-specific, short-run local boundary, not a sustained capacity guarantee. Notification delivery, account creation, claims, writes, photo uploads and queue lag were not capacity tested. A separate functional notification check can establish API → jobs → worker → Mailpit behavior without repeating the browsing curve.

Repeat relevant tests if the code, Nginx settings, dataset, Docker resource limits or hardware changes. If the team fixes the observed Nginx upstream connection errors, retain these results as the original baseline and compare new results against them. Longer runs would be needed to claim sustained capacity or uptime, regardless of the diagram.

AWS t4g.micro and db.t4g.micro are not equivalent to the laptop. The local 400-user result cannot prove AWS capacity, an autoscaling response or a cheaper cost per request. A defensible current comparison is **measured local performance + modeled AWS hosting cost**, with cloud performance still unmeasured.

Useful public references: [Mailpit documentation](https://mailpit.axllent.org/docs/), [repository at reviewed revision](https://github.com/cs5224-t17/Cloud-Computing-SaaS/tree/3783f647f96b433d316bc6d21f9a4e450d4fd4b5).
