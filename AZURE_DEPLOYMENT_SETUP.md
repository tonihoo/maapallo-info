# Azure Deployment Setup for maapallo.info

This guide will help you set up Azure resources and GitHub Actions for automatic deployment.

## Prerequisites

1. Azure account with active subscription
2. Azure CLI installed and logged in
3. GitHub repository with admin access

## Step 1: Azure Resource Setup

Run these commands in your terminal:

```bash
# Login to Azure (if not already logged in)
az login

# Set your subscription (replace with your subscription ID)
az account set --subscription "your-subscription-id"

# Create resource group
az group create --name maapallo-info-group --location "North Europe"

# Create Azure Container Registry
az acr create --resource-group maapallo-info-group \
  --name maapalloregistry \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
az acr credential show --name maapalloregistry --resource-group maapallo-info-group

# Create App Service Plan (Linux)
az appservice plan create --name maapallo-info-plan \
  --resource-group maapallo-info-group \
  --is-linux \
  --sku B1

# Create Web App
az webapp create --resource-group maapallo-info-group \
  --plan maapallo-info-plan \
  --name maapallo-info-app \
  --deployment-container-image-name maapalloregistry.azurecr.io/maapallo-info-app:latest

# Configure Web App to use ACR
az webapp config container set --name maapallo-info-app \
  --resource-group maapallo-info-group \
  --container-image-name maapalloregistry.azurecr.io/maapallo-info-app:latest \
  --container-registry-url https://maapalloregistry.azurecr.io \
  --container-registry-user maapalloregistry \
  --container-registry-password "$(az acr credential show --name maapalloregistry --query passwords[0].value -o tsv)"

# Create service principal for GitHub Actions
az ad sp create-for-rbac --name "maapallo-info-github-actions" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/maapallo-info-group \
  --sdk-auth
```

## Step 2: GitHub Secrets Setup

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### Required Secrets:

1. **AZURE_CREDENTIALS**: The JSON output from the service principal creation command
2. **ACR_USERNAME**: Get from `az acr credential show --name maapalloregistry`
3. **ACR_PASSWORD**: Get from `az acr credential show --name maapalloregistry`
4. **VITE_CESIUM_ION_TOKEN**: Your Cesium Ion token (copy from your .env file)

### Example commands to get credentials:

```bash
# Get ACR credentials
az acr credential show --name maapalloregistry --resource-group maapallo-info-group

# The output will show username and password - add these as GitHub secrets
```

## Step 3: Environment Variables for Azure Web App

Set environment variables in your Azure Web App:

```bash
# Set database and app configuration
az webapp config appsettings set --name maapallo-info-app \
  --resource-group maapallo-info-group \
  --settings \
    ENVIRONMENT=production \
    PG_HOST="your-postgres-host" \
    PG_PORT=5432 \
    PG_USER="your-db-user" \
    PG_PASSWORD="your-db-password" \
    PG_DB="your-db-name" \
    SERVER_PORT=8080
```

## Step 4: Database Setup (if using Azure Database for PostgreSQL)

```bash
# Create PostgreSQL server
az postgres server create --resource-group maapallo-info-group \
  --name maapallo-postgres \
  --location "North Europe" \
  --admin-user dbadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name GP_Gen5_2 \
  --version 13

# Create database
az postgres db create --resource-group maapallo-info-group \
  --server-name maapallo-postgres \
  --name maapallo_db

# Configure firewall to allow Azure services
az postgres server firewall-rule create --resource-group maapallo-info-group \
  --server maapallo-postgres \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Step 5: PostGIS Extension Setup

Azure PostgreSQL Flexible Server requires PostGIS to be enabled via the `azure.extensions` parameter:

```bash
# Enable PostGIS extension
az postgres flexible-server parameter set \
  --resource-group maapallo-info-group \
  --server-name maapallo-info-db \
  --name azure.extensions \
  --value "POSTGIS"

# Create the PostGIS extension in the database
az postgres flexible-server execute \
  --name maapallo-info-db \
  --admin-user maapalloadmin \
  --database-name maapallo_info \
  --admin-password "your-password" \
  --querytext "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Step 6: Manual First Deployment

After setting up all resources and secrets, trigger the first deployment:

1. Push changes to the `main` branch
2. Check GitHub Actions for deployment status
3. Verify the app is running at: https://maapallo-info-app.azurewebsites.net

## 🎉 Deployment Status

✅ **Deployment Complete!**

The application is successfully deployed and running at:
- **Frontend**: https://maapallo-info-app.azurewebsites.net/
- **API Health**: https://maapallo-info-app.azurewebsites.net/api/v1/health/
- **API Features**: https://maapallo-info-app.azurewebsites.net/api/v1/feature/

## Step 7: Troubleshooting

### Check application logs:
```bash
az webapp log tail --name maapallo-info-app --resource-group maapallo-info-group
```

### Check container status:
```bash
az webapp show --name maapallo-info-app --resource-group maapallo-info-group --query state
```

### Restart the app:
```bash
az webapp restart --name maapallo-info-app --resource-group maapallo-info-group
```

### Verify PostGIS extension is installed:
```bash
az postgres flexible-server execute \
  --name maapallo-info-db \
  --admin-user maapalloadmin \
  --database-name maapallo_info \
  --admin-password "your-password" \
  --querytext "SELECT extname FROM pg_extension WHERE extname = 'postgis';"
```
