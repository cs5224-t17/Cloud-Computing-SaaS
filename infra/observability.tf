resource "aws_cloudwatch_log_group" "app" {
  name              = "/${local.name}/app"
  retention_in_days = 14
}

# ---------- cost guardrail ----------

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}

# ---------- dashboard: the latency / uptime / scaling numbers the evaluation section needs ----------

locals {
  alb_dim = ["LoadBalancer", aws_lb.api.arn_suffix]
  tg_dim  = ["TargetGroup", aws_lb_target_group.api.arn_suffix, "LoadBalancer", aws_lb.api.arn_suffix]
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.name
  dashboard_body = jsonencode({
    widgets = [
      { type = "metric", x = 0, y = 0, width = 12, height = 6, properties = {
        title = "ALB latency (s)", region = var.region, view = "timeSeries", period = 60,
        metrics = [
          concat(["AWS/ApplicationELB", "TargetResponseTime"], local.alb_dim, [{ stat = "p50", label = "p50" }]),
          concat(["AWS/ApplicationELB", "TargetResponseTime"], local.alb_dim, [{ stat = "p95", label = "p95" }]),
          concat(["AWS/ApplicationELB", "TargetResponseTime"], local.alb_dim, [{ stat = "p99", label = "p99" }]),
        ]
      } },
      { type = "metric", x = 12, y = 0, width = 12, height = 6, properties = {
        title = "Requests & errors (per min)", region = var.region, view = "timeSeries", period = 60, stat = "Sum",
        metrics = [
          concat(["AWS/ApplicationELB", "RequestCount"], local.alb_dim),
          concat(["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count"], local.alb_dim),
          concat(["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count"], local.alb_dim),
        ]
      } },
      { type = "metric", x = 0, y = 6, width = 12, height = 6, properties = {
        title = "Healthy targets / ASG size", region = var.region, view = "timeSeries", period = 60,
        metrics = [
          concat(["AWS/ApplicationELB", "HealthyHostCount"], local.tg_dim, [{ stat = "Minimum" }]),
          ["AWS/AutoScaling", "GroupInServiceInstances", "AutoScalingGroupName", aws_autoscaling_group.app.name, { stat = "Maximum" }],
        ]
      } },
      { type = "metric", x = 12, y = 6, width = 12, height = 6, properties = {
        title = "CPU %", region = var.region, view = "timeSeries", period = 60, stat = "Average",
        metrics = [
          ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", aws_autoscaling_group.app.name, { label = "API (ASG avg)" }],
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.db.identifier, { label = "RDS" }],
        ]
      } },
      { type = "metric", x = 0, y = 12, width = 12, height = 6, properties = {
        title = "Notification queue", region = var.region, view = "timeSeries", period = 60, stat = "Sum",
        metrics = [
          ["AWS/SQS", "NumberOfMessagesSent", "QueueName", aws_sqs_queue.events.name],
          ["AWS/SQS", "NumberOfMessagesDeleted", "QueueName", aws_sqs_queue.events.name],
          ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.events_dlq.name, { label = "DLQ depth", stat = "Maximum" }],
        ]
      } },
      { type = "metric", x = 12, y = 12, width = 12, height = 6, properties = {
        title = "RDS connections / free storage", region = var.region, view = "timeSeries", period = 300,
        metrics = [
          ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.db.identifier, { stat = "Maximum" }],
          ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.db.identifier, { stat = "Minimum", yAxis = "right" }],
        ]
      } },
    ]
  })
}
