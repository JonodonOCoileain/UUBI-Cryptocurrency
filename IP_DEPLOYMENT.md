# 🌐 Deploy UUBI to Your IP Address

## Your IP Address: 73.142.57.47

## 🚀 Quick Deploy

### Option 1: Automatic Deploy Script
```bash
./deploy-to-ip.sh
```

### Option 2: Manual Deploy
```bash
# Stop any running server
pkill -f "node server.js"

# Set environment variables
export NODE_ENV=production
export PORT=3000
export CORS_ORIGIN="http://73.142.57.47:3000,http://localhost:3000"

# Start server
node server-ip.js
```

## 🌐 Access Your Website

Once deployed, your UUBI website will be available at:

- **Local Access**: http://localhost:3000
- **Network Access**: http://[your-local-ip]:3000
- **Public Access**: http://73.142.57.47:3000

## 🔧 Router Configuration (For Public Access)

### 1. Port Forwarding
You need to forward port 3000 on your router:

1. **Access Router Admin Panel**:
   - Open browser and go to: http://192.168.1.1 or http://192.168.0.1
   - Login with admin credentials

2. **Find Port Forwarding Settings**:
   - Look for "Port Forwarding", "Virtual Server", or "NAT"
   - Usually under "Advanced" or "Security" settings

3. **Add Port Forward Rule**:
   - **Service Name**: UUBI
   - **External Port**: 3000
   - **Internal Port**: 3000
   - **Protocol**: TCP
   - **Internal IP**: Your computer's local IP (usually 192.168.x.x)

4. **Save and Apply**:
   - Save the configuration
   - Restart router if required

### 2. Firewall Configuration

#### macOS:
```bash
# Allow incoming connections on port 3000
sudo pfctl -f /etc/pf.conf
```

#### Windows:
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings" → "Allow another app"
4. Browse to your Node.js installation
5. Check both "Private" and "Public" networks

#### Linux:
```bash
# UFW (Ubuntu)
sudo ufw allow 3000

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## 🔍 Testing Your Deployment

### 1. Local Test
```bash
curl http://localhost:3000/api/health
```

### 2. Network Test
```bash
# From another device on your network
curl http://[your-local-ip]:3000/api/health
```

### 3. Public Test
```bash
# From external network
curl http://73.142.57.47:3000/api/health
```

## 🛠️ Troubleshooting

### Common Issues:

#### 1. "Connection Refused"
- **Cause**: Port not forwarded or firewall blocking
- **Solution**: Check router port forwarding and firewall settings

#### 2. "Timeout" or "Can't Reach"
- **Cause**: ISP blocking incoming connections
- **Solution**: Contact ISP or use a different port (8080, 80, 443)

#### 3. "CORS Error"
- **Cause**: CORS origin not configured correctly
- **Solution**: Update CORS_ORIGIN environment variable

#### 4. "Permission Denied"
- **Cause**: Port already in use or insufficient permissions
- **Solution**: 
  ```bash
  # Kill process using port 3000
  lsof -ti:3000 | xargs kill -9
  
  # Or use different port
  PORT=8080 node server-ip.js
  ```

## 🔐 Security Considerations

### 1. Firewall Rules
- Only open necessary ports
- Consider using a non-standard port
- Monitor access logs

### 2. Rate Limiting
- The server includes rate limiting (1000 requests per 15 minutes)
- Adjust in `server-ip.js` if needed

### 3. HTTPS (Optional)
For production use, consider:
- Using a reverse proxy (nginx)
- SSL certificates (Let's Encrypt)
- Domain name instead of IP

## 📊 Monitoring

### Health Check
```bash
curl http://73.142.57.47:3000/api/health
```

### System Stats
```bash
curl http://73.142.57.47:3000/api/stats
```

### Server Logs
Monitor server logs for:
- Connection attempts
- Error messages
- Performance metrics

## 🌍 Alternative Deployment Options

### 1. Cloud Services
- **Railway**: `railway up`
- **Heroku**: `heroku create && git push heroku main`
- **DigitalOcean**: App Platform
- **AWS**: EC2 or Elastic Beanstalk

### 2. VPS/Dedicated Server
- Rent a VPS (DigitalOcean, Linode, Vultr)
- Deploy using Docker
- Use domain name instead of IP

### 3. Local Network Only
- Deploy only for local network access
- No port forwarding needed
- Access via local IP only

## 📱 Mobile Access

Once deployed, you can access your UUBI website from:
- **Desktop browsers**: Any modern browser
- **Mobile browsers**: iOS Safari, Android Chrome
- **Tablets**: iPad, Android tablets

## 🔄 Updates and Maintenance

### Update Website
```bash
# Pull latest changes
git pull origin main

# Restart server
pkill -f "node server.js"
node server-ip.js
```

### Backup Data
```bash
# Backup data directory
tar -czf uubi-backup-$(date +%Y%m%d).tar.gz data/
```

## 📞 Support

If you encounter issues:
1. Check server logs
2. Verify port forwarding
3. Test firewall settings
4. Check ISP restrictions
5. Try different port numbers

## 🎉 Success!

Once everything is working, your UUBI website will be accessible worldwide at:
**http://73.142.57.47:3000**

Users can:
- Register accounts
- Verify identity with biometrics
- Mine UUBI tokens
- Access all UBI features
