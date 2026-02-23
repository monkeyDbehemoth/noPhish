# noPhish 🔐

A 3-layer phishing email detection system with Gmail integration and real-time dashboard.

## Features

- 🔍 **3-Layer Detection**: URL Analysis, HTML Analysis, ML Pattern Matching
- 📧 **Gmail Integration**: Automatic email monitoring via Google Apps Script
- 📊 **Real-time Dashboard**: Live monitoring with dark theme
- 📱 **Email Alerts**: Instant notifications via EmailJS when phishing detected
- 🚀 **Netlify Deployment**: Free hosting for dashboard and webhook

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          System Flow                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Emails to shahshubhangam@gmail.com]                              │
│           │                                                         │
│           ▼                                                         │
│  [Google Apps Script] ◄─── Runs every 5 minutes                   │
│           │                                                         │
│           ▼                                                         │
│  [Netlify Webhook] ◄─── Analyzes for phishing                      │
│           │                                                         │
│           ├──────────────────┬──────────────────┐                  │
│           ▼                  ▼                  ▼                  │
│    [Dashboard]      [EmailJS Alert]    [Local Detection]           │
│   (Web UI)          (to Gmail)          (SMTP Listener)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Links

| Service | URL |
|---------|-----|
| Dashboard | https://nophish-detection.netlify.app |
| Webhook | https://nophish-detection.netlify.app/.netlify/functions/webhook-alert |

---

## Setup Guide

### Part 1: Gmail Integration (Automatic Email Monitoring)

This allows your Gmail to automatically forward emails for phishing analysis.

#### Step 1: Create Google Apps Script

1. Go to: https://script.google.com
2. Click **+ New Project**
3. Delete any existing code
4. Paste this code:

```javascript
// noPhish Gmail Forwarder
const WEBHOOK_URL = 'https://nophish-detection.netlify.app/.netlify/functions/webhook-alert';

function setupGmailForwarder() {
  const labelName = 'noPhish-Analyzed';
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  const hasTrigger = triggers.some(t => t.getHandlerFunction() === 'checkNewEmails');
  
  if (!hasTrigger) {
    ScriptApp.newTrigger('checkNewEmails')
      .timeBased()
      .everyMinutes(5)
      .create();
  }
  
  Logger.log('noPhish set up!');
}

function checkNewEmails() {
  const labelName = 'noPhish-Analyzed';
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  
  const unreadCount = GmailApp.getInboxUnreadCount();
  Logger.log('Unread count: ' + unreadCount);
  
  const threads = GmailApp.getInboxThreads(0, 10);
  Logger.log('Threads fetched: ' + threads.length);
  
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    
    if (thread.hasLabel(label)) continue;
    
    try {
      const messages = thread.getMessages();
      const email = messages[0];
      
      const emailData = {
        sender: email.getFrom(),
        subject: email.getSubject(),
        body: email.getPlainBody().substring(0, 2000),
        timestamp: email.getDate().toISOString()
      };
      
      Logger.log('Processing: ' + email.getSubject());
      
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify(emailData)
      });
      
      Logger.log('Response: ' + response.getResponseCode());
      
      thread.addLabel(label);
      thread.markRead();
      
    } catch (error) {
      Logger.log('Error: ' + error.message);
    }
  }
}
```

#### Step 2: Save and Run

1. Click **Save** (Ctrl+S)
2. Click the **▶️ Run** button
3. Select `setupGmailForwarder` from dropdown
4. Click **Run**
5. Click **Review Permissions** → choose your account → **Allow**

#### Step 3: Deploy as Web App (Required for automation)

1. Click **Deploy** (top right) → **New deployment**
2. Click the **Select type** gear icon → choose **Web app**
3. Fill in:
   - **Description:** `noPhish Forwarder`
   - **Execute as:** **Me**
   - **Who has access:** **Only myself**
4. Click **Deploy**
5. Click **Authorize access** → **Allow**

✅ **Done!** The script will now automatically check your Gmail every 5 minutes.

---

### Part 2: EmailJS Alerts

When phishing is detected, you'll receive an email alert.

#### Already Configured:
- Service ID: `service_80fn7ge`
- Template ID: `template_k3z097y`
- Your Email: `shahshubhangam@gmail.com`

#### To Enable API Access (if not already):

1. Go to: https://dashboard.emailjs.com/admin/settings
2. Look for **"API"** or **"Allow server-side API calls"**
3. Enable it

---

### Part 3: Local SMTP Server (Optional)

Run the detection engine locally on your machine.

``` dependencies
pip install -r requirements.txt

# Start the SMTP server
pythonbash
# Install main.py

# Test with a phishing email (in another terminal)
python test_html_email.py
```

The SMTP server listens on `127.0.0.1:2525`.

---

## Using the Dashboard

### Access the Dashboard
**URL:** https://nophish-detection.netlify.app

### Features

1. **Dashboard** - Overview with stats and recent activity
2. **All Emails** - View all analyzed emails
3. **Live Monitor** - Real-time scanning status

### Viewing Results

- The dashboard auto-refreshes every 30 seconds
- Click **Refresh** button to update manually
- Emails marked as "Phishing" with score ≥ 3 will trigger an EmailJS alert

---

## Testing the System

### Test 1: Direct Webhook Test

```bash
curl -X POST https://nophish-detection.netlify.app/.netlify/functions/webhook-alert \
  -H "Content-Type: application/json" \
  -d '{
    "sender":"attacker@fake-bank.com",
    "subject":"URGENT: Verify your account",
    "body":"Click here to verify: http://fake-link.com password required"
  }'
```

### Test 2: Send Email to Yourself

1. Send an email to `shahshubhangam@gmail.com` with subject: "URGENT: Verify your account now!"
2. Wait 5 minutes for the script to run
3. Or manually run the script in Google Apps Script
4. Check your dashboard and Gmail for alerts

---

## Configuration

### Environment Variables (Netlify)

| Variable | Value |
|----------|-------|
| EMAILJS_SERVICE_ID | service_80fn7ge |
| EMAILJS_TEMPLATE_ID | template_k3z097y |
| EMAILJS_PUBLIC_KEY | iSq75hb6y30zhVEHR |
| EMAILJS_PRIVATE_KEY | (your private key) |

### Detection Thresholds

| Score | Result |
|-------|--------|
| 0-2 | Clean (no alert) |
| 3+ | Phishing (EmailJS alert sent) |

### Phishing Keywords Detected

- urgent, verify, login, password, account suspended
- click here, update, confirm, bank, paypal
- unusual activity, verify identity

---

## Troubleshooting

### Script Not Running Automatically?

1. Make sure you **deployed as Web App** (Part 1, Step 3)
2. Check **Executions** in Google Apps Script
3. Manually run `checkNewEmails` to test

### Not Receiving Email Alerts?

1. Check EmailJS settings - enable "Allow server-side API calls"
2. Check your Gmail spam folder
3. Test with direct webhook curl command

### Dashboard Not Updating?

- Dashboard auto-refreshes every 30 seconds
- Click the **Refresh** button
- Check your Gmail script is running

---

## Files

```
noPhish/
├── main.py                    # SMTP server entry point
├── check_detection.py         # Test detection engine
├── test_html_email.py         # Send test emails
├── requirements.txt           # Python dependencies
│
├── detection_engine/          # Core detection logic
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
│       └── webhook-alert.js # Email analysis webhook
│
└── GoogleAppsScript/        # Gmail integration
    └── gmail_forwarder.js
```

---

## License

MIT

---

## Credits

- Built with Flask, BeautifulSoup4, scikit-learn
- Dashboard hosted on Netlify
- Email alerts via EmailJS
