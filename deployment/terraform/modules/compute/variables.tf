variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_name" {
  description = "Existing AWS key pair name"
  type        = string
}

variable "security_group_id" {
  description = "Security group ID from networking module"
  type        = string
}

variable "volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
}