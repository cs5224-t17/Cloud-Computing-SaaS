# CS5224 Team 17 — build, deploy and tear down.
# Every AWS call is pinned to the cs5224 profile so the default profile is never used by accident.
export AWS_PROFILE ?= cs5224
export AWS_REGION  ?= ap-southeast-1

TF      := terraform -chdir=infra
# Terraform's own SSO refresh is flaky; hand it the CLI's short-lived creds instead.
TF_AUTH := eval "$$(aws configure export-credentials --format env)" && unset AWS_PROFILE &&
out      = $(shell $(TF) output -raw $(1))
GIT_SHA := $(shell git rev-parse --short HEAD)

.PHONY: help login check up apply bootstrap push web seed refresh deploy destroy onprem-up onprem-down loadtest outputs sleep wake cost

help:
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

login: ## Refresh the SSO session (tokens expire every few hours)
	aws sso login --profile $(AWS_PROFILE)

check: ## Confirm we are in the CS5224 account
	@aws sts get-caller-identity --query Account --output text | grep -qx 137792804857 \
	  || (echo "!! Not the CS5224 account — run 'make login'"; exit 1)

up: check bootstrap push apply web seed ## First-time deploy of everything
	@echo "App: $(call out,app_url)"

bootstrap: check ## Create the ECR repo first so the image can be pushed before instances boot
	$(TF) init -input=false
	$(TF_AUTH) $(TF) apply -input=false -auto-approve -target=aws_ecr_repository.api

apply: check ## terraform apply (shows plan, asks to confirm)
	$(TF_AUTH) $(TF) apply -input=false

push: check ## Build the API/worker image (linux/arm64) and push to ECR
	$(eval REPO := $(call out,ecr_repo))
	aws ecr get-login-password | docker login --username AWS --password-stdin $(firstword $(subst /, ,$(REPO)))
	docker build --platform linux/arm64 -t $(REPO):latest -t $(REPO):$(GIT_SHA) api
	docker push --all-tags $(REPO)

web: check ## Build the SPA, upload to S3, invalidate CloudFront
	cd web && npm ci && npm run build
	aws s3 sync web/dist/assets s3://$(call out,web_bucket)/assets --cache-control "public,max-age=31536000,immutable"
	aws s3 sync web/dist s3://$(call out,web_bucket) --delete --exclude "assets/*" --cache-control "no-cache"
	$(eval CF := $(call out,cloudfront_id))
	$(if $(CF),aws cloudfront create-invalidation --distribution-id $(CF) --paths "/*" --query Invalidation.Id --output text,@echo "no CloudFront: API serves the SPA from S3")

seed: check ## Import seed/listings.csv through the admin endpoint (waits for the API to be healthy)
	$(eval URL := $(call out,app_url))
	$(eval TOKEN := $(shell aws ssm get-parameter --name /cs5224-t17/admin_token --with-decryption --query Parameter.Value --output text))
	@until curl -sf $(URL)/api/health >/dev/null; do echo "waiting for API..."; sleep 15; done
	@curl -sf -X POST "$(URL)/api/admin/import" -H "x-admin-token: $(TOKEN)" -H "Content-Type: text/csv" --data-binary @seed/listings.csv; echo

refresh: check ## Roll instances so they pull the newest image
	aws autoscaling start-instance-refresh --auto-scaling-group-name $(call out,asg_name) --query InstanceRefreshId --output text

deploy: push web refresh ## Ship new code (image + SPA)

sleep: check ## Idle mode: scale API to 0 and stop RDS (ALB/IPs still bill; RDS auto-restarts after 7 days)
	aws autoscaling update-auto-scaling-group --auto-scaling-group-name $(call out,asg_name) --min-size 0 --desired-capacity 0
	aws rds stop-db-instance --db-instance-identifier cs5224-t17-db --query DBInstance.DBInstanceStatus --output text

wake: check ## Undo sleep
	aws rds start-db-instance --db-instance-identifier cs5224-t17-db --query DBInstance.DBInstanceStatus --output text || true
	aws rds wait db-instance-available --db-instance-identifier cs5224-t17-db
	aws autoscaling update-auto-scaling-group --auto-scaling-group-name $(call out,asg_name) --min-size 1 --desired-capacity 1

cost: check ## Month-to-date cost for project=cs5224, by service
	aws ce get-cost-and-usage --time-period Start=$(shell date +%Y-%m-01),End=$(shell date -v+1d +%Y-%m-%d) \
	  --granularity MONTHLY --metrics UnblendedCost --filter '{"Tags":{"Key":"project","Values":["cs5224"]}}' \
	  --group-by Type=DIMENSION,Key=SERVICE --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' --output table

outputs:
	@$(TF) output

destroy: check ## Tear down ALL AWS resources (asks to confirm)
	$(TF_AUTH) $(TF) destroy -input=false

onprem-up: ## Run the on-prem equivalent locally (http://localhost:8080, mail UI :8025)
	docker compose -f deploy/onprem/docker-compose.yml up --build -d
	@until curl -sf localhost:8080/api/health >/dev/null; do sleep 2; done
	curl -s -X POST localhost:8080/api/admin/import -H "x-admin-token: onprem-admin" -H "Content-Type: text/csv" --data-binary @seed/listings.csv; echo

onprem-down:
	docker compose -f deploy/onprem/docker-compose.yml down -v

# make loadtest TARGET=https://xxxx.cloudfront.net   (or the ALB URL, or http://localhost:8080 for on-prem)
loadtest: ## Run the k6 load test against TARGET
	docker run --rm -i -e TARGET=$(TARGET) -v $(PWD)/loadtest:/scripts grafana/k6:0.55.0 run --summary-export=/scripts/results-$(shell date +%Y%m%d-%H%M).json /scripts/k6.js
