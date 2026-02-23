# noPhish - Phishing Email Detection System

A 3-layer phishing email detection system with dashboard and email alerts.

## Features

- 🔍 **3-Layer Detection**: URL Analysis, HTML Analysis, ML Pattern Matching
- 📧 **Email Alerts**: Receive instant notifications via EmailJS when phishing is detected
- 📊 **Dashboard**: View detection statistics and email logs
- 🚀 **Deploy to Netlify**: Free hosting for the dashboard

## Quick Start

### Local Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Start the SMTP server
python main.py

# In another terminal, test with a phishing email
python test_html_email.py
```

### Dashboard

```bash
# Run local dashboard
cd dashboard
pip install -r requirements.txt
python app.py
```

Visit: http://localhost:5000

## Netlify Deployment

### Option 1: Dashboard Only (Static)

1. Push to GitHub: https://github.com/monkeyDbehemoth/noPhish
2. Connect to Netlify
3. Deploy!

Dashboard: https://nophish-detection.netlify.app

### Option 2: Email Alerts via Webhook

Set up email forwarding to receive emails:

1. **Get a Free Domain**: https://www.freenom.com
2. **Set up Email Forwarding**: https://forwardemail.net (free)
3. **Configure Webhook**: Point to your Netlify function

#### Webhook Setup:

```
Your Domain → ForwardEmail.net → Your Webhook URL
```

The webhook URL will be:
```
https://nophish-detection.netlify.app/.netlify/functions/webhook-alert
```

## Environment Variables

For EmailJS alerts, set these in Netlify:

| Variable | Value |
|----------|-------|
| EMAILJS_SERVICE_ID | service_80fn7ge |
| EMAILJS_TEMPLATE_ID | template_k3z097y |
| EMAILJS_PUBLIC_KEY | iSq75hb6y30zhVEHR |
| ALERT_EMAIL | shahshubhangam@gmail.com |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     noPhish System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Emails] → [SMTP Listener] → [Detection Engine]          │
│                    │                    │                  │
│                    ↓                    ↓                  │
│              [Dashboard]        [EmailJS Alert]            │
│              (Flask/Local)       (→ Gmail)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                    Netlify Deployment
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Email Forwarding] → [Netlify Function] → [EmailJS]       │
│                                                             │
│  Dashboard: https://nophish-detection.netlify.app           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Detection Layers

1. **URL Analysis**: Checks for suspicious URLs, blacklisted domains, excessive subdomains
2. **HTML Analysis**: Detects login forms, password fields, script tags
3. **ML Pattern Matching**: Keyword-based phishing detection

## License

MIT
