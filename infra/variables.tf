variable "project" {
  type    = string
  default = "cs5224"
}

variable "account_id" {
  type    = string
  default = "137792804857"
}

variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "ses_emails" {
  description = "Addresses to verify in SES (sandbox: only these can send/receive). The first one is the From address."
  type        = list(string)
}

variable "alert_emails" {
  description = "Recipients of AWS Budget alerts."
  type        = list(string)
}

variable "budget_usd" {
  description = "Monthly budget (USD; AWS Budgets bills in USD). 15 USD ~= 20 SGD."
  type        = number
  default     = 15
}

variable "instance_type" {
  type    = string
  default = "t4g.micro" # Graviton/arm64: cheapest burstable; images are built for linux/arm64
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "asg_min" {
  type    = number
  default = 1
}

variable "asg_max" {
  type    = number
  default = 3
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "github_repo" {
  description = "owner/repo allowed to deploy via GitHub Actions OIDC. Empty string disables the OIDC role."
  type        = string
  default     = "riccoljy/cs5224"
}
