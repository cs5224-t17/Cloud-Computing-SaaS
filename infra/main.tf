terraform {
  required_version = ">= 1.9"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  # State is local (infra/terraform.tfstate, git-ignored). Only one person should run apply at a time.
}

provider "aws" {
  region              = var.region
  allowed_account_ids = [var.account_id] # hard-fail if the wrong AWS profile is active
  default_tags {
    tags = { project = var.project, team = "cs5224-team17", managed_by = "terraform" }
  }
}

data "aws_caller_identity" "me" {}
data "aws_availability_zones" "azs" { state = "available" }

locals {
  name = "${var.project}-t17" # resource-name prefix: cs5224-t17-*
  azs  = slice(data.aws_availability_zones.azs.names, 0, 2)
}
