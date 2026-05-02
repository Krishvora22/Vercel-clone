#!/bin/bash

set -e  

GREEN='\033[0;32m'

echo "Navigating to Supabase Terraform directory..."
cd deployment/supabase/terraform

echo "Destroying Terraform-managed resources..."
terraform destroy -auto-approve
cd ../../..

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}     Supabase Stopped Successfully          ${NC}"
echo -e "${GREEN}      Have a nice day, Priyanshu            ${NC}"
echo -e "${GREEN}============================================${NC}"