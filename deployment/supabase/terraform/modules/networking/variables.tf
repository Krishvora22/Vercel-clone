variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed for SSH access"
  type        = string
}