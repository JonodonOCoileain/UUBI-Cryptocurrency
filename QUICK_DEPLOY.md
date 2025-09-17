# 🚀 Quick Deploy Guide

## Deploy to Railway (Recommended - Free)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login and Deploy
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASS=your-gmail-app-password
railway variables set JWT_SECRET=your-secure-jwt-secret
railway variables set CORS_ORIGIN=https://your-app.railway.app

# Deploy
railway up
```

### 3. Get Your URL
Railway will give you a URL like: `https://your-app-name.railway.app`

---

## Deploy to Heroku

### 1. Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

### 2. Deploy
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-uubi-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-gmail-app-password
heroku config:set JWT_SECRET=your-secure-jwt-secret

# Deploy
git push heroku main
```

---

## Deploy with Docker

### 1. Build and Run
```bash
# Build Docker image
docker build -t uubi .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e EMAIL_USER=your-email@gmail.com \
  -e EMAIL_PASS=your-gmail-app-password \
  -e JWT_SECRET=your-secure-jwt-secret \
  uubi
```

### 2. Access
Open: http://localhost:3000

---

## Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## 🔧 Required Environment Variables

Set these in your deployment platform:

```env
NODE_ENV=production
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGIN=https://your-domain.com
```

---

## 📧 Gmail Setup

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this as EMAIL_PASS

---

## ✅ Test Your Deployment

1. **Health Check**: `curl https://your-domain.com/api/health`
2. **Website**: Visit your domain
3. **Registration**: Try registering a new account
4. **Login**: Test login functionality
5. **Email**: Check if password reset emails work

---

## 🆘 Troubleshooting

- **Email not working**: Check Gmail app password
- **CORS errors**: Update CORS_ORIGIN environment variable
- **File uploads failing**: Check file size limits
- **Database errors**: Check data directory permissions

---

## 📊 Monitoring

- **Railway**: Built-in logs and metrics
- **Heroku**: `heroku logs --tail`
- **Docker**: `docker logs container-name`

---

## 🔐 Security Checklist

- [ ] HTTPS enabled (automatic on Railway/Heroku)
- [ ] Strong JWT secret set
- [ ] Gmail app password configured
- [ ] CORS origin set correctly
- [ ] Rate limiting enabled
- [ ] Environment variables secured
