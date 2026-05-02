variable "aws_region" {
  description = "AWS region to deploy Supabase instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "project_name" {
  description = "Project identifier used for naming resources"
  type        = string
}

variable "key_name" {
  description = "Existing AWS key pair name"
  type        = string
}

variable "key_path" {
  description = "Local path to .pem file for SSH"
  type        = string
}

variable "snapshot_id" {
  description = "EBS snapshot ID to restore Supabase from"
  type        = string
}

variable "volume_size" {
  description = "Root EBS volume size in GB — must be >= snapshot size"
  type        = number
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed for SSH"
  type        = string
}