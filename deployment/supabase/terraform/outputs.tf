output "public_ip" {
  description = "EC2 public IP — update Cloudflare DNS A record to this"
  value       = module.compute.public_ip
}