module "networking" {
  source = "./modules/networking"
  project_name     = var.project_name
  allowed_ssh_cidr = var.allowed_ssh_cidr
}

module "compute" {
  source = "./modules/compute"
  project_name      = var.project_name
  instance_type     = var.instance_type
  key_name          = var.key_name
  security_group_id = module.networking.security_group_id
  volume_size       = var.volume_size
}