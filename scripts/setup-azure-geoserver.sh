#!/bin/bash

# Azure Infrastructure Setup for Maapallo.info GeoServer Branch
# This script sets up the required Azure resources for the NGO account

set -e

# Configuration
RESOURCE_GROUP="maapallo-info-group"
LOCATION="northeurope"
ACR_NAME="maapalloregistry"
DB_SERVER_NAME="maapallo-postgis-server"
DB_NAME="maapallo_gis"
CONTAINER_ENV_NAME="maapallo-env"

echo "🚀 Setting up Azure infrastructure for Maapallo.info GeoServer branch"
echo "=================================================="

# Check if user is logged in
echo "📋 Checking Azure CLI login status..."
if ! az account show &>/dev/null; then
    echo "❌ Not logged in to Azure CLI"
    echo "Please run: az login"
    exit 1
fi

# Display current account
CURRENT_ACCOUNT=$(az account show --query user.name -o tsv)
echo "✅ Logged in as: $CURRENT_ACCOUNT"

# Confirm this is the NGO account
read -p "🔍 Is this your NGO account? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Please switch to your NGO account first:"
    echo "1. Run: az logout"
    echo "2. Run: az login"
    echo "3. Select your NGO account"
    exit 1
fi

# Get subscription info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "📊 Using subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output table

# Create Container Registry
echo "🐳 Creating Azure Container Registry..."
if ! az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    az acr create \
        --name $ACR_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Basic \
        --admin-enabled true \
        --output table

    echo "✅ Container Registry created: $ACR_NAME.azurecr.io"
else
    echo "ℹ️ Container Registry already exists: $ACR_NAME.azurecr.io"
fi

# Get ACR credentials for GitHub secrets
echo "🔑 Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Create Container Apps environment
echo "🏗️ Creating Container Apps environment..."
if ! az containerapp env show --name $CONTAINER_ENV_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    az containerapp env create \
        --name $CONTAINER_ENV_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --output table

    echo "✅ Container Apps environment created: $CONTAINER_ENV_NAME"
else
    echo "ℹ️ Container Apps environment already exists: $CONTAINER_ENV_NAME"
fi

# Create PostgreSQL server (optional - you can also use the containerized version)
read -p "🗄️ Do you want to create a managed PostgreSQL server? (y/N): " create_db
if [[ $create_db == [yY] ]]; then
    echo "🗄️ Creating PostgreSQL Flexible Server..."

    # Generate a random password if not provided
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    if ! az postgres flexible-server show --name $DB_SERVER_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
        az postgres flexible-server create \
            --name $DB_SERVER_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --admin-user dbadmin \
            --admin-password "$DB_PASSWORD" \
            --sku-name Standard_B2s \
            --storage-size 128 \
            --version 14 \
            --public-access 0.0.0.0 \
            --output table

        # Create database
        az postgres flexible-server db create \
            --database-name $DB_NAME \
            --server-name $DB_SERVER_NAME \
            --resource-group $RESOURCE_GROUP

        echo "✅ PostgreSQL server created"
        echo "📋 DB Password (save this): $DB_PASSWORD"
    else
        echo "ℹ️ PostgreSQL server already exists"
    fi
fi

# Create service principal for GitHub Actions
echo "🔐 Creating service principal for GitHub Actions..."
SP_NAME="maapallo-geoserver-github-sp"

# Check if service principal exists
if az ad sp list --display-name $SP_NAME --query "[].appId" -o tsv | grep -q .; then
    echo "ℹ️ Service principal already exists"
    SP_APP_ID=$(az ad sp list --display-name $SP_NAME --query "[].appId" -o tsv)
else
    # Create service principal
    SP_CREDENTIALS=$(az ad sp create-for-rbac \
        --name $SP_NAME \
        --role Contributor \
        --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
        --sdk-auth)

    SP_APP_ID=$(echo $SP_CREDENTIALS | jq -r '.clientId')
    echo "✅ Service principal created"
fi

# Assign ACR push/pull permissions to service principal
echo "🐳 Assigning ACR permissions to service principal..."
az role assignment create \
    --assignee $SP_APP_ID \
    --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME \
    --role AcrPush || echo "ℹ️ Permission may already exist"

echo ""
echo "🎉 Azure infrastructure setup complete!"
echo "=================================================="
echo ""
echo "📋 GitHub Secrets to configure:"
echo "--------------------------------"
echo "AZURE_CREDENTIALS_NGO: [Service Principal JSON - check Azure portal]"
echo "ACR_USERNAME: $ACR_USERNAME"
echo "ACR_PASSWORD: $ACR_PASSWORD"
echo "DB_ADMIN_USER: dbadmin"
echo "DB_ADMIN_PASSWORD: [Your DB password]"
echo "GEOSERVER_ADMIN_PASSWORD: [Choose a strong password]"
echo "JWT_SECRET_KEY: [Your existing JWT secret]"
echo "ADMIN_USERNAME: [Your existing admin username]"
echo "ADMIN_PASSWORD: [Your existing admin password]"
echo "CESIUM_ION_TOKEN: [Your existing Cesium token]"
echo ""
echo "🔗 Next steps:"
echo "1. Configure the above secrets in GitHub repository settings"
echo "2. Push to the 'geoserver' branch to trigger deployment"
echo "3. Monitor the deployment in GitHub Actions"
echo ""
echo "🌐 Resources created:"
echo "- Resource Group: $RESOURCE_GROUP"
echo "- Container Registry: $ACR_NAME.azurecr.io"
echo "- Container Apps Environment: $CONTAINER_ENV_NAME"
if [[ $create_db == [yY] ]]; then
    echo "- PostgreSQL Server: $DB_SERVER_NAME"
fi
echo ""
