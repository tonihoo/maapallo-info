# Custom Domain Setup Guide

This guide explains how to add your custom domain `maapallo.info` (purchased from domainhotelli.fi) to your Azure App Service.

## Prerequisites

- Domain `maapallo.info` purchased from domainhotelli.fi
- Azure App Service `maapallo-info-app` running in North Europe
- Access to domainhotelli.fi control panel

## Choose Your Method

You have two options, similar to how Vercel works:

### Method 1: Azure DNS (Recommended - Like Vercel)
✅ **Just change nameservers at domainhotelli.fi - Azure handles everything else**
✅ Full DNS management in Azure Portal
✅ Easy subdomain management
✅ Better integration with Azure services

### Method 2: Manual DNS at domainhotelli.fi
⚠️ Manual DNS record management
⚠️ Need to update records if App Service IP changes

---

## METHOD 1: Azure DNS (Recommended - Vercel-like Experience)

### Step 1: Azure DNS is Already Set Up! ✅

Let me set up Azure DNS for you:

```bash
# Create Azure DNS zone
az network dns zone create --resource-group maapallo-info-group --name maapallo.info

# Create A record for root domain
az network dns record-set a add-record --resource-group maapallo-info-group --zone-name maapallo.info --record-set-name @ --ipv4-address 20.107.224.7

# Create CNAME record for www subdomain
az network dns record-set cname set-record --resource-group maapallo-info-group --zone-name maapallo.info --record-set-name www --cname maapallo-info-app.azurewebsites.net
```

### Step 2: Get Your Azure Nameservers

```bash
az network dns zone show --resource-group maapallo-info-group --name maapallo.info --query "nameServers" --output table
```

You'll get 4 nameservers like:
- `ns1-xx.azure-dns.com`
- `ns2-xx.azure-dns.net`
- `ns3-xx.azure-dns.org`
- `ns4-xx.azure-dns.info`

### Step 3: Update Nameservers at domainhotelli.fi

1. **Log in to domainhotelli.fi**
2. **Go to your domain management** for `maapallo.info`
3. **Find "Nameservers" or "DNS Settings"**
4. **Replace the current nameservers** with the 4 Azure nameservers from Step 2
5. **Save the changes**

### Step 4: Add Domain Verification Record (IMPORTANT!)

Before Azure will accept your custom domain, you need to prove you own it:

```bash
# Get your app's domain verification ID
az webapp show --name maapallo-info-app --resource-group maapallo-info-group --query customDomainVerificationId --output tsv

# Add the verification TXT record (I've already done this for you)
az network dns record-set txt add-record --resource-group maapallo-info-group --zone-name maapallo.info --record-set-name asuid --value "B8D0B32F6E5F4E1A8B7C3A5D2F6E4B1A3C7E9F0A8B6C4D2E5F7A9B1C3E5F7A9B1"
```

## ⚠️ IMPORTANT: Don't Use "App Service Domains"!

**WRONG WAY** ❌: Going to "App Service Domains" (this is for buying domains through Azure)
**RIGHT WAY** ✅: Going to your App Service → "Custom domains" section

### Step 5: Add Custom Domain in Azure Portal (CORRECT METHOD)

1. **Go to your App Service directly**:
   - Azure Portal → App Services → `maapallo-info-app`
   - In the left menu, click **"Custom domains"** (NOT "App Service Domains")

2. **Add your external domain**:
   - Click **"+ Add custom domain"**
   - Enter: `maapallo.info`
   - Azure will validate the DNS records
   - Click "Add custom domain"

3. **If you get "domain unavailable"**:
   - Make sure you've updated nameservers at domainhotelli.fi first
   - Wait for DNS propagation (up to 48 hours)
   - The verification TXT record must be live

### Step 5a: First, Update Nameservers at domainhotelli.fi

**YOU MUST DO THIS FIRST** before adding the domain in Azure:

```bash
# Get your Azure nameservers (these are the ones you need at domainhotelli.fi)
az network dns zone show --resource-group maapallo-info-group --name maapallo.info --query "nameServers"
```

Expected output (4 nameservers like):
- `ns1-xx.azure-dns.com`
- `ns2-xx.azure-dns.net`
- `ns3-xx.azure-dns.org`
- `ns4-xx.azure-dns.info`

### Step 6: Configure SSL (same as Method 2)

That's it! With Azure DNS, you get:
- ✅ Automatic DNS management
- ✅ Easy subdomain creation
- ✅ No need to worry about IP changes
- ✅ Full integration with Azure

---

## METHOD 2: Manual DNS at domainhotelli.fi

### Step 1: Get Your Azure App Service IP and Hostname

First, get the necessary information from your Azure App Service:

```bash
# Get your app service details
az webapp show --name maapallo-info-app --resource-group maapallo-info-group --query "{defaultHostName:defaultHostName,outboundIpAddresses:outboundIpAddresses}" --output table

# Get the IP address for A record (if needed)
az webapp show --name maapallo-info-app --resource-group maapallo-info-group --query "possibleOutboundIpAddresses" --output tsv
```

Your Azure App Service hostname will be: `maapallo-info-app.azurewebsites.net`

### Step 2: Configure DNS at domainhotelli.fi

Log in to your domainhotelli.fi control panel and navigate to DNS management for `maapallo.info`:

### Option A: CNAME Record (Recommended)
Add a CNAME record pointing to your Azure App Service:

- **Type**: CNAME
- **Name**: `www` (for www.maapallo.info)
- **Value**: `maapallo-info-app.azurewebsites.net`
- **TTL**: 3600 (1 hour)

### Option B: A Record (Alternative)
If you prefer to use the root domain without www:

1. First get the App Service IP:
```bash
nslookup maapallo-info-app.azurewebsites.net
```

2. Add an A record:
- **Type**: A
- **Name**: `@` (for root domain maapallo.info)
- **Value**: [IP address from step 1]
- **TTL**: 3600

### For both www and root domain:
Add both records if you want both `maapallo.info` and `www.maapallo.info` to work.

## Step 3: Add Custom Domain in Azure Portal

1. **Open Azure Portal**:
   - Go to https://portal.azure.com
   - Navigate to your App Service `maapallo-info-app`

2. **Add Custom Domain**:
   - In the left menu, click on "Custom domains"
   - Click "+ Add custom domain"
   - Enter your domain: `maapallo.info` (or `www.maapallo.info`)
   - Click "Validate"

3. **Domain Validation**:
   - Azure will check if the DNS records are properly configured
   - If validation passes, click "Add custom domain"

## Step 4: Configure SSL Certificate

After adding the custom domain, secure it with SSL:

1. **In Custom Domains section**:
   - Find your newly added domain
   - Click on "Add binding" next to your domain

2. **Choose SSL Certificate**:
   - Select "App Service Managed Certificate" (free option)
   - Or upload your own certificate if you have one
   - Click "Add binding"

## Step 5: Test Your Domain

After DNS propagation (can take up to 48 hours, usually much faster):

```bash
# Test if domain resolves
nslookup maapallo.info

# Test HTTPS
curl -I https://maapallo.info
```

## Step 6: Update Application Configuration (if needed)

If your application needs to know about the custom domain, update any configuration:

```bash
# Set custom domain as allowed host (if using CORS)
az webapp config appsettings set --name maapallo-info-app --resource-group maapallo-info-group --settings ALLOWED_HOSTS="maapallo.info,www.maapallo.info,maapallo-info-app.azurewebsites.net"
```

## ⚠️ DOMAIN VERIFICATION ISSUE - SOLVED!

**Problem**: "Domain is not available" in Azure Portal even though you own it.

**Solution**: Azure needs proof that you own the domain. I've added the required verification record:

✅ **Domain verification TXT record added**: `asuid.maapallo.info`
✅ **DNS propagation needed**: Wait 5-15 minutes for DNS to propagate

**Now try again**:
1. Wait 10-15 minutes for DNS propagation
2. Go to Azure Portal → App Service → Custom domains
3. Click "+ Add custom domain"
4. Enter `maapallo.info` - it should now validate successfully!

---

## Troubleshooting

### DNS Issues
- **Check DNS propagation**: Use https://www.whatsmydns.net/ to check if DNS has propagated globally
- **Verify DNS records**: Use `dig` or `nslookup` to verify your DNS records

### Azure Validation Issues
- **Wait for DNS propagation**: DNS changes can take time to propagate
- **Check CNAME vs A record**: Make sure you're using the correct record type
- **Verify domain spelling**: Double-check the domain name is correct

### SSL Certificate Issues
- **Wait after domain addition**: SSL certificates can take a few minutes to provision
- **Check certificate status**: In Azure Portal, verify the certificate status

## Alternative: Using Azure CLI

You can also add the custom domain using Azure CLI:

```bash
# Add custom domain
az webapp config hostname add --webapp-name maapallo-info-app --resource-group maapallo-info-group --hostname maapallo.info

# Add SSL binding (requires certificate)
az webapp config ssl bind --certificate-thumbprint <thumbprint> --ssl-type SNI --name maapallo-info-app --resource-group maapallo-info-group
```

## DNS Configuration Summary

For domainhotelli.fi DNS management, add these records:

| Type  | Name | Value                              | TTL  |
|-------|------|------------------------------------|------|
| CNAME | www  | maapallo-info-app.azurewebsites.net| 3600 |
| A     | @    | [App Service IP]                   | 3600 |

## Final Notes

1. **DNS Propagation**: Can take up to 48 hours but usually much faster (15-30 minutes)
2. **SSL Certificate**: Azure provides free SSL certificates for custom domains
3. **Redirect**: Consider setting up a redirect from `www.maapallo.info` to `maapallo.info` or vice versa
4. **Monitoring**: Monitor your domain in Azure Portal to ensure it's working correctly

After completing these steps, your `maapallo.info` domain should point to your Azure App Service and be secured with SSL.

---

## 🎉 SUCCESS UPDATE: Domain is Working!

✅ **HTTP working**: `http://maapallo.info` resolves correctly to your app
⚠️ **HTTPS missing**: Chrome shows "Not Secure" - need to add SSL certificate

## 🔒 Add SSL Certificate (Final Step)

### Method 1: Azure Portal (Recommended)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your App Service**: App Services → `maapallo-info-app`
3. **Go to Custom domains**: Click "Custom domains" in left menu
4. **Find your domain**: You should see `maapallo.info` listed
5. **Add SSL binding**:
   - Click **"Add binding"** next to `maapallo.info`
   - Choose **"App Service Managed Certificate"** (FREE)
   - SSL Type: **"SNI SSL"**
   - Click **"Add binding"**

### Method 2: Azure CLI (Alternative)

```bash
# Create managed certificate and bind it
az webapp config ssl bind --certificate-type Managed --name maapallo-info-app --resource-group maapallo-info-group --ssl-type SNI --hostname maapallo.info
```

### After SSL is Added

**Test HTTPS**:
```bash
curl -I https://maapallo.info
```

**Browser**: Visit https://maapallo.info - should show secure padlock! 🔒

### Troubleshooting SSL

- **Certificate creation takes 5-10 minutes**
- **If "Add binding" is greyed out**: Domain might not be fully validated yet
- **If certificate fails**: Make sure domain validation TXT record is still live
- **Check certificate status**: App Service → TLS/SSL settings → Private Key Certificates
