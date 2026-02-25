# noPhish 🔐

A 3-layer phishing email detection system with Gmail IMAP integration, URL/File scanner, and real-time dashboard.

## Features

- 🔍 **3-Layer Detection**: URL Analysis, HTML Analysis, ML Pattern Matching
- 📧 **Gmail IMAP Integration**: Direct connection to Gmail - no Google Apps Script needed
- 🌐 **URL/File Scanner**: Scan any URL or file like VirusTotal
- 📊 **Real-time Dashboard**: Professional dark-themed dashboard
- 📱 **Email Alerts**: Instant notifications via EmailJS when phishing detected

---

## Quick Links

| Service | URL |
|---------|-----|
| Dashboard | https://nophish-detection.netlify.app |
| Webhook | https://nophish-detection.netlify.app/.netlify/functions/webhook-alert |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/monkeyDbehemoth/noPhish.git
cd noPhish

# Install dependencies
pip install -r requirements.txt
```

---

## Quick Start

### Option 1: IMAP Mode (Recommended - No Setup Needed!)

**IMAP connects directly to your Gmail and automatically scans all incoming emails!**

#### Step 1: Enable IMAP in Gmail

1. Go to Gmail → Settings → See all settings
2. Go to **Forwarding and POP/IMAP** tab
3. Enable **IMAP access**
4. Click **Save Changes**

#### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. In "Select app", choose **Mail**
4. In "Select device", choose **Other (Custom name)**
5. Enter: `noPhish`
6. Click **Generate**
7. **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

#### Step 3: Run IMAP Fetcher

```bash
# Set environment variables
export GMAIL_EMAIL=your-email@gmail.com
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Run in IMAP mode
python main.py --mode imap
```

Or create a `.env` file:
```
GMAIL_EMAIL=shahshubhangam@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Then run:
```bash
python main.py --mode imap
```

---

### Option 2: SMTP Listener Mode

Listen for emails sent to a specific port:

```bash
python main.py --mode smtp
```

The server listens on `127.0.0.1:2525`

---

### Option 3: Both Modes

Run both IMAP and SMTP simultaneously:

```bash
python main.py --mode both
```

---

## Gmail App Password Setup (Required for IMAP)

### How to Generate App Password:

1. **Go to Google Account Security:**
   https://myaccount.google.com/apppasswords

2. **Sign in** with your Google account

3. **Create App Password:**
   - Name: `noPhish`
   - Select app: **Mail**
   - Select device: **Other (Custom name)**

4. **Copy the password** (16 characters with spaces)

### Important Notes:
- App passwords are different from your regular password
- You need 2-Step Verification enabled on your Google account
- If you don't see "App passwords", go to: https://myaccount.google.com/security → 2-Step Verification

---

## Using the Dashboard

### Access the Dashboard
**URL:** https://nophish-detection.netlify.app

### Features

1. **Dashboard** - Overview with stats and recent activity
2. **Scanner** - URL/File scanner (VirusTotal-like)
3. **History** - All scanned emails, URLs, files

---

## How It Works

### IMAP Mode (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                    IMAP EMAIL FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Gmail] ◄─── IMAP Connection (every 60 seconds)        │
│     │                                                      │
│     ▼                                                      │
│  [New Emails] ──► 3-Layer Detection Engine                │
│     │                                                      │
│     ├──────────────┬──────────────┐                       │
│     ▼              ▼              ▼                       │
│  [Dashboard]   [EmailJS]    [Console Alert]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detection Layers

1. **URL Analysis**: Checks for suspicious URLs, blacklisted domains, URL shorteners, IP addresses
2. **HTML Analysis**: Detects login forms, password fields, script tags, iframes
3. **ML Pattern Matching**: Keyword-based phishing detection

---

## Testing

### Test URL Scanner

```bash
curl -X POST https://nophish-detection.netlify.app/.netlify/functions/url-scanner \
  -H "Content-Type: application/json" \
  -d '{"url":"http://suspicious-link.com/login"}'
```

### Test File Scanner

```bash
curl -X POST https://nophish-detection.netlify.app/.netlify/functions/file-scanner \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.html","content":"<script>alert(1)</script>"}'
```

---

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| GMAIL_EMAIL | Your Gmail address | shahshubhangam@gmail.com |
| GMAIL_APP_PASSWORD | Gmail App Password | xxxx xxxx xxxx xxxx |
| POLL_INTERVAL | IMAP check interval (seconds) | 60 |

### Detection Thresholds

| Score | Result |
|-------|--------|
| 0-2 | Clean (no alert) |
| 3+ | Phishing (EmailJS alert sent) |

---

## Files

```
noPhish/
├── main.py                    # Main entry point
├── imap_fetcher.py           # IMAP email fetcher
├── check_detection.py        # Test detection engine
├── requirements.txt           # Python dependencies
│
├── detection_engine/         # Core detection logic
│   ├── detector.py           # Main detector
│   ├── url_analysis.py       # Layer 1: URL analysis
│   ├── html_analysis.py      # Layer 2: HTML analysis
│   └── ml_analysis.py        # Layer 3: ML pattern
│
├── alerts/                   # Alert system
│   ├── alert.py             # Console alerts
│   └── emailjs_alert.py     # EmailJS alerts
│
├── dashboard/                # Local Flask dashboard
│   ├── app.py
│   └── templates/
│
├── dashboard-static/         # Netlify static dashboard
│   └── index.html
│
├── netlify/                 # Netlify functions
│   └── functions/
│       ├── webhook-alert.js
│       ├── url-scanner.js
│       └── file-scanner.js
│
└── GoogleAppsScript/        # Old Gmail integration (not needed anymore!)
    └── gmail_forwarder.js
```

---

## Troubleshooting

### IMAP Connection Issues

**Error: "Too many simultaneous connections"**
- Solution: Wait a few minutes, Gmail limits to 15 concurrent connections

**Error: "Invalid credentials"**
- Solution: Regenerate your App Password at https://myaccount.google.com/apppasswords

**Error: "Authentication failed"**
- Solution: Make sure you enabled 2-Step Verification first

### Not Receiving Alerts?

1. Check EmailJS settings - enable "Allow server-side API calls"
2. Check your Gmail spam folder
3. Test with direct webhook curl command

---

## Why IMAP is Better?

| Feature | IMAP | Google Apps Script |
|---------|------|-------------------|
| Real-time | ✓ Every 60s | ✓ Every 5min |
| Setup | Easy | Medium |
| Reliability | High | Medium |
| No Google Script | ✓ | ✗ |
| Works 24/7 | ✓ | Needs deployment |

---

## License

MIT
