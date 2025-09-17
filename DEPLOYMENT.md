# UUBI Production Deployment Guide

## 🚀 Quick Deploy to Railway

### 1. Prerequisites
- GitHub account
- Railway account (free at railway.app)
- Gmail account for email functionality

### 2. Deploy Steps

#### Option A: Deploy via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set EMAIL_HOST=smtp.gmail.com
railway variables set EMAIL_PORT=587
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASS=your-app-password
railway variables set JWT_SECRET=your-super-secure-jwt-secret-key-here

# Deploy
railway up
```

#### Option B: Deploy via Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Connect your GitHub repository
4. Select this repository
5. Railway will automatically detect it's a Node.js app
6. Set environment variables in the dashboard
7. Deploy!

### 3. Environment Variables to Set

```env
NODE_ENV=production
PORT=3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
JWT_SECRET=your-super-secure-jwt-secret-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://your-domain.railway.app
BLOCKCHAIN_NETWORK=development
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

### 4. Gmail Setup for Production

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as EMAIL_PASS

### 5. Custom Domain (Optional)

1. In Railway dashboard, go to your project
2. Click on "Settings" → "Domains"
3. Add your custom domain
4. Update CORS_ORIGIN to your custom domain

## 🌐 Alternative Deployment Options

### Heroku
```bash
# Install Heroku CLI
# Create Procfile (already created)
# Deploy
heroku create your-app-name
git push heroku main
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel
# Deploy
vercel --prod
```

### DigitalOcean App Platform
1. Connect GitHub repository
2. Select Node.js buildpack
3. Set environment variables
4. Deploy

## 🔧 Production Optimizations

### 1. Database
- Consider using PostgreSQL or MongoDB for production
- Current setup uses JSON files (suitable for small scale)

### 2. File Storage
- Use AWS S3 or similar for file uploads
- Current setup uses local storage

### 3. Monitoring
- Add logging with Winston
- Set up error tracking with Sentry
- Monitor performance with New Relic

### 4. Security
- Use HTTPS (Railway provides this automatically)
- Set up proper CORS policies
- Implement rate limiting
- Use environment variables for secrets

## 📊 Post-Deployment Checklist

- [ ] Website loads correctly
- [ ] Registration works
- [ ] Login works
- [ ] Email sending works
- [ ] Mining functionality works
- [ ] File uploads work
- [ ] All API endpoints respond
- [ ] HTTPS is enabled
- [ ] Environment variables are set
- [ ] Custom domain is configured (if applicable)

## 🆘 Troubleshooting

### Common Issues:
1. **Email not sending**: Check Gmail app password
2. **File uploads failing**: Check file size limits
3. **CORS errors**: Update CORS_ORIGIN environment variable
4. **Database errors**: Check data directory permissions

### Logs:
```bash
# Railway
railway logs

# Heroku
heroku logs --tail
```

## 📈 Scaling Considerations

- **Database**: Move to PostgreSQL for better performance
- **File Storage**: Use cloud storage (AWS S3, Cloudinary)
- **Caching**: Add Redis for session management
- **CDN**: Use Cloudflare for static assets
- **Load Balancing**: Multiple instances for high traffic

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit secrets to git
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement proper rate limiting
4. **Input Validation**: Validate all user inputs
5. **File Uploads**: Scan uploaded files for malware
6. **Authentication**: Use strong JWT secrets
7. **CORS**: Configure CORS properly
8. **Headers**: Use security headers (helmet.js)

## 📞 Support

For deployment issues:
1. Check Railway logs
2. Verify environment variables
3. Test locally first
4. Check GitHub issues
