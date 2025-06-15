#!/bin/bash

# Quick GitHub Secrets Extraction for maapallo.info
echo "🔐 GitHub Secrets Setup for maapallo.info"
echo "==========================================="
echo ""

echo "📋 Run these commands to get your GitHub secrets:"
echo ""

echo "1️⃣ Get ACR Username:"
echo "az acr credential show --name maapalloregistry --query username --output tsv"
echo ""

echo "2️⃣ Get ACR Password:"
echo "az acr credential show --name maapalloregistry --query 'passwords[0].value' --output tsv"
echo ""

echo "3️⃣ Get your Subscription and Tenant info:"
echo "az account show --query '{subscriptionId:id, tenantId:tenantId}' --output json"
echo ""

echo "4️⃣ Create Service Principal (save the output!):"
echo "az ad sp create-for-rbac --name 'maapallo-github-sp' --role contributor --scopes /subscriptions/a86a4321-af76-4f31-9089-ec1972e8a25f/resourceGroups/maapallo-info-group"
echo ""

echo "5️⃣ Get your Cesium Token:"
echo "cat .env | grep VITE_CESIUM_ION_TOKEN"
echo ""

echo "🎯 Then add these 4 secrets to GitHub:"
echo "• ACR_USERNAME (from command 1)"
echo "• ACR_PASSWORD (from command 2)"
echo "• VITE_CESIUM_ION_TOKEN (from command 5)"
echo "• AZURE_CREDENTIALS (JSON from command 4)"
echo ""

echo "📍 Your app will be available at:"
echo "https://maapallo-info-app.azurewebsites.net"
