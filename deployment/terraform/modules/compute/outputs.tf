output "public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.this.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.this.id
}

output "ami_id" {
  description = "AMI ID used for this instance"
  value       = data.aws_ami.ubuntu.id
}

output "ami_name" {
  description = "AMI name (confirms Ubuntu version)"
  value       = data.aws_ami.ubuntu.name
}