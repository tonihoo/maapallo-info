#!/bin/bash

echo "🔐 Gathering GitHub Secrets Information for maapallo.info"
echo "=================================================="
echo ""

# Get subscription and tenant info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "📋 Azure Information:"
echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Tenant ID: $TENANT_ID"
echo ""

# Get ACR credentials
echo "🐳 Azure Container Registry Credentials:"
ACR_USERNAME=$(az acr credential show --name maapalloregistry --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name maapalloregistry --query passwords[0].value -o tsv)
echo "ACR_USERNAME: $ACR_USERNAME"
echo "ACR_PASSWORD: $ACR_PASSWORD"
echo ""

# Create Azure credentials JSON for GitHub Actions
echo "🤖 Creating Azure Credentials for GitHub Actions..."
AZURE_CREDENTIALS=$(cat <<EOF
{
  "clientId": "$(az ad sp list --display-name 'maapallo-info-github-actions' --query '[0].appId' -o tsv)",
  "clientSecret": "$(az ad sp credential reset --id $(az ad sp list --display-name 'maapallo-info-github-actions' --query '[0].appId' -o tsv) --query password -o tsv)",
  "subscriptionId": "$SUBSCRIPTION_ID",
  "tenantId": "$TENANT_ID"
}
EOF
)

echo ""
echo "🔑 GitHub Secrets to Add:"
echo "========================="
echo ""
echo "1. AZURE_CREDENTIALS:"
echo "$AZURE_CREDENTIALS"
echo ""
echo "2. ACR_USERNAME:"
echo "$ACR_USERNAME"
echo ""
echo "3. ACR_PASSWORD:"
echo "$ACR_PASSWORD"
echo ""
echo "4. VITE_CESIUM_ION_TOKEN:"
echo "$(grep VITE_CESIUM_ION_TOKEN .env | cut -d'=' -f2)"
echo ""
echo "🌐 Your app will be available at:"
echo "https://maapallo-info-app.azurewebsites.net"
echo ""
echo "✅ Setup complete! Add these secrets to GitHub and push to main branch to deploy."
