resource "aws_ami" "from_snapshot" {
  name                = "${var.project_name}-ami-${formatdate("YYYYMMDDHHmm", timestamp())}"
  virtualization_type = "hvm"
  root_device_name    = "/dev/sda1"
  ena_support         = true          # ← ADD THIS LINE

  ebs_block_device {
    device_name           = "/dev/sda1"
    snapshot_id           = var.snapshot_id
    volume_size           = var.volume_size
    volume_type           = "gp3"
    delete_on_termination = true
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name    = "${var.project_name}-ami"
    Project = var.project_name
    Source  = "snapshot:${var.snapshot_id}"
  }
}

resource "aws_instance" "this" {
  ami                    = aws_ami.from_snapshot.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [var.security_group_id]

  root_block_device {
    volume_size           = var.volume_size
    volume_type           = "gp3"
    delete_on_termination = true

    tags = {
      Name    = "${var.project_name}-root-volume"
      Project = var.project_name
      Source  = "snapshot:${var.snapshot_id}"
    }
  }

  tags = {
    Name    = "${var.project_name}-server"
    Project = var.project_name
    Mode    = "on-demand"
    Role    = "database"
    Source  = "snapshot:${var.snapshot_id}"
  }
}