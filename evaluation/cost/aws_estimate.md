# AWS hosting cost estimate for Group 17

9 November evidence update: the teammate's exports are now archived and independently reviewed in [AWS monitoring findings](../performance/results/cloud-vs-onprem-20261108/aws_monitoring_findings.md). They identify one healthy t4g.micro API target, Single-AZ db.t4g.micro /20GBgp3, no observed scale-out and an8November daily cost ofUSD1.69. The daily-based730-hour run-rate isUSD51.40 with tax/credit basis incompletely documented. The USD65.49 model below remains a separate gross architecture estimate before allowances/tax, not the observed bill. See [on-prem and financial comparison](onprem_estimate.md) for the updated scope, FX/tax assumptions and reconciliation limits.

Prepared 7 November 2026. Region: Singapore, ap-southeast-1. Source: repository frontend commit `3783f647f96b433d316bc6d21f9a4e450d4fd4b5`, checked against the supplied diagrams. See [architecture review](../architecture_consistency.md).

The proposed AWS setup costs approximately **USD65.49/month** at the modeled prototype traffic, with one EC2 instance running throughout the month. This includes fixed infrastructure and small usage assumptions. It is an official AWS list-price reconstruction, **not an actual bill or a saved AWS Pricing Calculator export**. Calculator browser controls were unavailable; exact service inputs are supplied separately for entering and exporting an estimate. No AWS infrastructure was created or changed.

## What the estimate includes

| Monthly component | USD |
|---|---:|
| One t4g.micro EC2, 730 hours | 7.7380 |
| Assumed 8 GB gp3 EC2 root disk | 0.7680 |
| One db.t4g.micro RDS PostgreSQL, 730 hours | 18.2500 |
| RDS 20 GB gp3 | 2.7600 |
| One ALB, 730 hours | 18.3960 |
| ALB traffic LCUs | 0.0029 |
| Three public IPv4 addresses, 730 hours | 10.9500 |
| S3 storage and requests | 0.0163 |
| CloudFront transfer, HTTPS and Function requests | 1.3210 |
| SQS, SES and ECR | 0.2527 |
| CloudWatch logs, dashboard, API queries and alarms | 4.0140 |
| Cross-AZ database traffic allowance | 0.0200 |
| Other small-usage contingency | 1.0000 |
| **Total, using unrounded components** | **65.4888** |

The largest fixed expenses are the load balancer, database and public IP addresses. The API and notification worker run together on EC2; the worker is not charged as another VM. The repository has no NAT gateway, so no NAT monthly charge was added.

## Traffic and sizing assumptions

The prototype uses 28 listings, matching the local dataset. It assumes 100 monthly active users, 100,000 CloudFront HTTPS requests, 10 GB viewer delivery, and 30,000 API requests per month. These are planning values, not observations and not 100 concurrent k6 users. Other assumptions are 0.29 GB S3 storage, 1,000 PUTs, 10,000 GETs, 10,000 SPA function invocations, 100 listing-update events, 1,000 email recipients, 1 GB ECR images and 1 GB new logs per month.

Logs retain 14 days; storage is approximated as 14/30 of monthly ingestion, before compression. The model budgets one USD3 dashboard, two standard alarms and 10,000 GetMetricData metrics. One long-polling worker makes approximately 131,400 idle SQS polls per 730-hour month; three additional queue operations per event are allowed. Messages are assumed small enough for one billable request unit. Larger messages, retries, extra consumers or short polling change the bill.

ALB usage assumes smooth traffic, one new connection per API request, five-second connection duration and approximately 12 KB processed per request including response. The maximum connection/active-connection/byte dimension is approximately 0.000493 average LCU. Hourly bursts and larger uploads can cost more. One GB cross-AZ EC2/RDS payload is budgeted at USD0.02 combined; actual traffic direction and placement require bill verification.

The root disk is not explicitly pinned in Terraform: 8 GB gp3 is a declared assumption, not a verified deployed value. The ALB uses a minimum two public addresses; one EC2 adds a third. Recheck the actual inventory before calling this an operating cost.

## Autoscaling sensitivity

| Same prototype traffic, different EC2 uptime | Monthly USD |
|---|---:|
| One instance all month | 65.49 |
| Three instances for two hours/day over 30 days; one otherwise | 67.50 |
| Three instances all month | 89.91 |

These cases change average EC2 hours, root disk allocation, public addresses and idle worker polling. They hold other traffic/log inputs constant to isolate instance-count sensitivity. They are not measured autoscaling behavior or complete high-load forecasts. Actual retained EBS after termination, additional logs and queue work may differ.

## Larger business scenarios

| Scenario | Listings | Assumed monthly active users | Viewer GB/month | HTTPS requests/month | Monthly USD |
|---|---:|---:|---:|---:|---:|
| Prototype | 28 | 100 | 10 | 100,000 | 65.49 |
| Small directory | 100 | 500 | 50 | 500,000 | 72.02 |
| Growing directory | 1,000 | 2,000 | 200 | 2,000,000 | 99.71 |
| Larger directory | 10,000 | 10,000 | 1,000 | 10,000,000 | 246.81 |

All four retain one EC2 micro and one RDS micro to show a minimum-footprint price projection. **It has not been established that those instances support the larger workloads.** Traffic, emails, storage and logging inputs change independently; listing count alone does not size a server. Use the editable workbook to change resource sizes after AWS measurements.

At the prototype assumptions, hosting is USD2.34 per listing per month, or USD0.65 per assumed monthly active user. These denominators are different. At an illustrative SGD1.30/USD (not a verified exchange-rate quote), monthly hosting would be SGD85.14. Nine sellers at SGD10/month or five at SGD20/month cover this hosting figure before transaction fees, labor, support and other business costs. This is not proof of willingness to pay or full business break-even.

## Pricing basis and limitations

Rates were retrieved from official AWS public price lists on 7 November 2026. Archived JSON/selected EC2 CSV rows and URLs are in `aws_pricing_sources/`; rates, SKUs, dates and formulas are in [the workbook](aws_cost_estimate.xlsx) and `aws_estimate_data.json`. Key rates: EC2 USD0.0106/hour, RDS USD0.025/hour, RDS gp3 USD0.138/GB-month, ALB USD0.0252/hour and IPv4 USD0.005/address-hour. CloudFront assumes pay-as-you-go Asia pricing, not a bundled flat-rate plan.

This is a **gross list-price planning estimate before free allowances, credits, discounts and tax**. Even generally available CloudFront/SQS/CloudWatch allowances are deliberately not deducted; this makes the basis reproducible but may overstate a small account's net bill. Do not present it as the cheapest achievable bill. Calculator results may apply those allowances automatically. Billing can also include other account projects.

No paid support, domain, labor, payment fees, disaster-recovery resources, excess backup storage, large uploads, substantial CI/CD build cost or database CPU-credit overage is priced. Standard SSM parameters, IAM and ASG have no additional service fee in the modeled configuration; incidental KMS/SES payload usage is covered only by a USD1 contingency, not measured. Backup usage is assumed within the included RDS allowance. RDS T4g runs in Unlimited mode and can charge USD0.075 per surplus vCPU-hour; this estimate assumes no surplus. EC2 source configuration uses Standard CPU credits and can throttle when credits run out. These constraints matter for sustained tests.

The configured USD15 monthly budget is an alert, not a cap; it is below the gross modeled monthly cost. Credits may hide charges temporarily but do not remove the architecture's underlying cost. This review did not change the budget.

Public sources: [AWS Price List bulk files](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-ppslong.html), [Singapore EC2 CSV](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-southeast-1/index.csv), [Singapore RDS JSON](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/ap-southeast-1/index.json), [Singapore ALB JSON](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/ap-southeast-1/index.json), [IPv4 pricing](https://aws.amazon.com/vpc/pricing/), [RDS PostgreSQL CPU-credit rules](https://aws.amazon.com/rds/postgresql/pricing/), [AWS dashboard price example](https://docs.aws.amazon.com/solutions/latest/automated-security-response-on-aws/cost.html), [cross-AZ database transfer](https://aws.amazon.com/blogs/architecture/exploring-data-transfer-costs-for-aws-managed-databases/).

## Report-ready paragraph

We estimated the AWS hosting cost using the architecture defined in our repository and official AWS prices for the Singapore region, retrieved on 7 November 2026. With one t4g.micro application instance, a single-AZ db.t4g.micro PostgreSQL database, 20 GB database storage, an application load balancer and the supporting storage, email, queue and monitoring services, the modeled cost was approximately USD65.49 per month before free allowances, credits and taxes. The estimate assumes 28 listings and low prototype traffic; these usage values are planning assumptions. Keeping three application instances running throughout the month increases the estimate to approximately USD89.91. Our local Docker tests provide measured on-prem browsing performance, while these AWS figures provide a cost projection. We have not established that the AWS micro instances can support the concurrency observed on the laptop.
