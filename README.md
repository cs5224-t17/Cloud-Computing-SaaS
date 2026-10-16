# Cloud Computing SaaS — CS5224 Team 17

> Product name is a placeholder ("SG Home Business Directory"). Change `APP_NAME` in `api/src/config.js` (or the `APP_NAME` env var) and `web/src/api.js` + `web/index.html`.

A SaaS directory of Singapore's **non-food home-based businesses**. Customers search, filter, and follow listings to get email updates. Owners claim pre-seeded listings and manage their services, hours, photos and availability.

```
api/        Node.js/Express REST API + notification worker (one Docker image, two commands)
web/        React SPA (Vite). Dockerfile = Nginx image for on-prem
seed/       listings.csv — initial listings, loaded via POST /api/admin/import
infra/      Terraform for the whole AWS deployment
deploy/onprem/  Docker Compose equivalent on one server (cost comparison baseline)
loadtest/   k6 script
```

## Architecture

| Concern | AWS | On-prem (Docker Compose) | Switch |
|---|---|---|---|
| Frontend | S3 + CloudFront (HTTPS) | Nginx container | — |
| API | Docker on EC2 t4g.micro, ALB + Auto Scaling group (1–3, CPU 50 %) | `api` container | — |
| Database | RDS PostgreSQL 16, db.t4g.micro, single-AZ | `postgres` container | `PG*` env |
| Search | Postgres full-text search (`tsvector` + GIN) | same | — |
| Media | S3 `media/` bucket via CloudFront `/media/*` | local volume served by API | `STORAGE_DRIVER=s3\|local` |
| Events | SQS (+ DLQ) | `jobs` table, `SKIP LOCKED` polling | `QUEUE_DRIVER=sqs\|pg` |
| Email | SES (sandbox) | SMTP relay (Mailpit) | `MAIL_DRIVER=ses\|smtp\|log` |
| Secrets | SSM Parameter Store (SecureString) | `.env` | — |
| Observability | CloudWatch Logs + dashboard, AWS Budget alerts | `docker logs` | — |
| CI/CD | GitHub Actions → OIDC role → ECR/S3/instance refresh | `docker compose up --build` | — |

CloudFront is the single public origin: `/` → web bucket, `/media/*` → media bucket, `/api/*` → ALB. This gives HTTPS with no domain or ACM certificate, and no CORS. EC2 instances run in public subnets and accept only port 3000 from the ALB security group, so no NAT gateway is needed. RDS is in private subnets and accepts only traffic from the app security group. For a shell on an instance, use SSM Session Manager (there is no SSH).

**Auth / claim flow:** register → emailed verification link → JWT. To claim a listing, a verified user requests a claim. A 6-digit code goes to the contact email *already on file* for that business (expires after 30 min). Entering the code transfers ownership. Each owner edit publishes a `listing.updated` event, and the worker emails every follower.

## AWS setup (once per machine)

```bash
aws configure sso --profile cs5224     # SSO session name: nus; account 137792804857; role IsbUsersPS; region ap-southeast-1
brew install hashicorp/tap/terraform
cp infra/terraform.tfvars.example infra/terraform.tfvars   # put team emails in
```

> ⚠️ Every `make` target pins `AWS_PROFILE=cs5224`, and Terraform pins `allowed_account_ids`. Don't run raw `aws`/`terraform` without `AWS_PROFILE=cs5224`, because your default profile may be a different account.

SSO tokens expire after a few hours. Run `make login` at the start of each session.

## Deploy

```bash
make up        # first time: ECR → push image → terraform apply → upload SPA → seed listings
make deploy    # later code changes: push image + SPA, roll instances
make outputs   # app_url, alb_url, dashboard_url, ...
```

After the first apply, **each address in `ses_emails` receives an AWS verification email, and someone must click the link**. In the SES sandbox, mail is delivered only to verified addresses. That covers sign-up verification, claim codes and follower notifications. For a claim demo, set the listing's `contact_email` in `seed/listings.csv` to a verified address and re-run `make seed`.

### CI/CD
Terraform creates a GitHub OIDC role. Under repo **Settings → Variables → Actions**, set:
`AWS_DEPLOY_ROLE_ARN` (`make outputs` → `github_deploy_role_arn`), `WEB_BUCKET`, `CLOUDFRONT_ID`.
After that, each push to `main` touching `api/` or `web/` builds, pushes and deploys. Without the variables, CI only builds.

## Cost control

Rough 24/7 list-price estimate (ap-southeast-1, USD/month):

| Item | ~USD/mo |
|---|---|
| ALB (hourly + minimal LCU) | 18–20 |
| RDS db.t4g.micro + 20 GB gp3 | 21–22 |
| Public IPv4 ×3 (ALB ×2, EC2 ×1) @ $0.005/h | 11 |
| EC2 t4g.micro ×1 | 7–8 |
| CloudFront, S3, SQS, SES, CloudWatch, SSM | < 2 |
| **Total** | **~60** |

These are estimates; the NUS SCP blocks the Pricing API. For real numbers, use `make cost` (Cost Explorer filtered by the `project=cs5224` tag, which may take 24 h to activate as a cost-allocation tag) or the Billing console.

- `make sleep` / `make wake`: scale the API to 0 and stop RDS while idle (saves ~$28/mo; ALB and IPs still bill).
- `make destroy`: removes **everything** (DB data included; re-seed with `make up`). The CloudFront URL changes on rebuild.
- An AWS Budget alerts `alert_emails` at 50 % / 80 % actual and 100 % forecast of `budget_usd`.

## On-prem equivalent / local dev

```bash
make onprem-up      # http://localhost:8080   — emails land in Mailpit at http://localhost:8025
make onprem-down
```

Admin token for on-prem is `onprem-admin`. The same images run in both environments; only env vars differ.

## Load test

```bash
make loadtest TARGET=$(terraform -chdir=infra output -raw app_url)   # via CloudFront
make loadtest TARGET=$(terraform -chdir=infra output -raw alb_url)   # ALB directly
make loadtest TARGET=http://host.docker.internal:8080                # on-prem
```

The test ramps to 100 VUs for 5 min. A JSON summary is written to `loadtest/`. Watch the CloudWatch dashboard (`make outputs` → `dashboard_url`) for p50/p95/p99 latency, scale-out and RDS CPU, and screenshot it for the report.
