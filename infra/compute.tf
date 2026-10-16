# ---------- EC2 instance role ----------

resource "aws_iam_role" "app" {
  name = "${local.name}-app-ec2"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "app_ecr" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "app_ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" # Session Manager shell instead of SSH
}

resource "aws_iam_role_policy" "app" {
  name = "app"
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["ssm:GetParameter", "ssm:GetParameters"],
      Resource = "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${local.name}/*" },
      { Effect = "Allow", Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      Resource = aws_sqs_queue.events.arn },
      { Effect = "Allow", Action = ["ses:SendEmail"], Resource = "*" },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:DeleteObject"], Resource = "${aws_s3_bucket.media.arn}/media/*" },
      { Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.app.arn}:*" },
    ]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.name}-app-ec2"
  role = aws_iam_role.app.name
}

# ---------- launch template + auto scaling group ----------

data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_launch_template" "app" {
  name_prefix            = "${local.name}-app-"
  image_id               = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile { arn = aws_iam_instance_profile.app.arn }
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2 # containers need IMDS for role credentials
  }
  credit_specification { cpu_credits = "standard" } # avoid unlimited-mode surprise charges
  monitoring { enabled = false }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    region       = var.region
    project      = local.name
    image        = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
    registry     = split("/", aws_ecr_repository.api.repository_url)[0]
    log_group    = aws_cloudwatch_log_group.app.name
    db_host      = aws_db_instance.db.address
    queue_url    = aws_sqs_queue.events.url
    media_bucket = aws_s3_bucket.media.bucket
    mail_from    = var.ses_emails[0]
    app_base_url = "https://${aws_cloudfront_distribution.cdn.domain_name}"
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-app", project = var.project }
  }
  tag_specifications {
    resource_type = "volume"
    tags          = { project = var.project }
  }
}

resource "aws_autoscaling_group" "app" {
  name                      = "${local.name}-app"
  min_size                  = var.asg_min
  max_size                  = var.asg_max
  vpc_zone_identifier       = aws_subnet.public[*].id
  target_group_arns         = [aws_lb_target_group.api.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300
  wait_for_capacity_timeout = "0"

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  instance_refresh {
    strategy = "Rolling"
    preferences { min_healthy_percentage = 0 } # 1 instance: allow replace-in-place
  }

  tag {
    key                 = "project"
    value               = var.project
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name                   = "${local.name}-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 50
  }
}

# ---------- ALB ----------

resource "aws_lb" "api" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "api" {
  name                 = "${local.name}-api"
  port                 = 3000
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 15
  health_check {
    path                = "/api/health"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
