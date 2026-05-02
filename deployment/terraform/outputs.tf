output "public_ip" {
  description = "EC2 public IP address"
  value       = module.compute.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = module.compute.instance_id
}

output "ssh_command" {
  description = "Ready-to-use SSH command"
  value       = "ssh -i ${var.key_path} ubuntu@${module.compute.public_ip}"
}

output "instance_info" {
  description = "Instance configuration summary"
  value       = "Type: ${var.instance_type} | Region: ${var.aws_region} | Mode: ON-DEMAND"
}