# 🚀 Deploy UUBI to Railway

## **Answer to Railway Dropdown: "Deploy from GitHub repo"**

## 📋 **Step-by-Step Railway Deployment**

### **1. Push to GitHub First**

```bash
# Create GitHub repository (do this on github.com)
# Then connect your local repo:

git remote add origin https://github.com/YOUR_USERNAME/uubi-cryptocurrency.git
git branch -M main
git push -u origin main
```

### **2. Railway Deployment Process**

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"** ← **This is your answer!**
5. **Choose your UUBI repository**
6. **Railway will auto-detect Node.js and deploy!**

### **3. Environment Variables to Set**

In Railway dashboard, go to your project → Variables tab:

```env
NODE_ENV=production
PORT=3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
JWT_SECRET=your-super-secure-jwt-secret-key-here
CORS_ORIGIN=https://your-app-name.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **4. Gmail Setup for Railway**

1. **Enable 2-Factor Authentication** on Gmail
2. **Generate App Password**:
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this as `EMAIL_PASS`

### **5. Railway Will Automatically:**

✅ Detect it's a Node.js app
✅ Install dependencies (`npm install`)
✅ Start with `npm start`
✅ Assign a public URL
✅ Handle HTTPS automatically
✅ Provide logs and monitoring

### **6. Your Website Will Be Available At:**

`https://your-app-name.railway.app`

## 🔧 **Railway Configuration Files**

Railway will use these files automatically:
- ✅ `package.json` - Dependencies and start script
- ✅ `railway.json` - Railway-specific config
- ✅ `server.js` - Main application file

## 📊 **After Deployment**

### **Test Your Deployment:**
```bash
# Health check
curl https://your-app-name.railway.app/api/health

# System stats
curl https://your-app-name.railway.app/api/stats
```

### **Monitor in Railway Dashboard:**
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Deployments**: Deployment history
- **Variables**: Environment variables

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Build Fails**:
   - Check `package.json` has correct start script
   - Verify all dependencies are listed
   - Check Railway logs for specific errors

2. **App Crashes**:
   - Check environment variables are set
   - Verify Gmail credentials
   - Check application logs

3. **CORS Errors**:
   - Update `CORS_ORIGIN` to your Railway URL
   - Check frontend is making requests to correct domain

## 🎉 **Success!**

Once deployed, your UUBI website will be:
- ✅ **Publicly accessible** worldwide
- ✅ **HTTPS enabled** automatically
- ✅ **Auto-scaling** based on traffic
- ✅ **Monitored** with built-in metrics
- ✅ **Persistent** data storage

## 📱 **Features Available:**

- User registration and login
- Biometric identity verification
- Mining functionality
- UBI distribution system
- Email notifications
- File upload handling
- Real-time statistics

## 🔄 **Updates**

To update your deployment:
```bash
git add .
git commit -m "Update UUBI features"
git push origin main
```

Railway will automatically redeploy!

## 💰 **Pricing**

- **Free Tier**: 500 hours/month, $5 credit
- **Pro Plan**: $5/month for unlimited usage
- **Perfect for UUBI deployment!**

---

**Ready to deploy? Answer "Deploy from GitHub repo" in Railway!** 🚀
