output "app_url" { value = "https://${aws_cloudfront_distribution.cdn.domain_name}" }
output "alb_url" { value = "http://${aws_lb.api.dns_name}" }
output "ecr_repo" { value = aws_ecr_repository.api.repository_url }
output "web_bucket" { value = aws_s3_bucket.web.bucket }
output "media_bucket" { value = aws_s3_bucket.media.bucket }
output "cloudfront_id" { value = aws_cloudfront_distribution.cdn.id }
output "asg_name" { value = aws_autoscaling_group.app.name }
output "db_endpoint" { value = aws_db_instance.db.address }
output "dashboard_url" {
  value = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards/dashboard/${aws_cloudwatch_dashboard.main.dashboard_name}"
}
output "github_deploy_role_arn" { value = local.gh ? aws_iam_role.deploy[0].arn : "" }
