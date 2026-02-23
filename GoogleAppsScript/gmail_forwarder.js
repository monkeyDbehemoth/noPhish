// noPhish Gmail Forwarder
// This script forwards emails to the noPhish webhook for phishing analysis

const WEBHOOK_URL = 'https://nophish-detection.netlify.app/.netlify/functions/webhook-alert';

// Run this function to set up the Gmail filter
function setupGmailForwarder() {
  // Create a label for processed emails
  const labelName = 'noPhish-Analyzed';
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  
  // Create a time-based trigger to check emails every 5 minutes
  const triggers = ScriptApp.getProjectTriggers();
  const hasTrigger = triggers.some(t => t.getHandlerFunction() === 'checkNewEmails');
  
  if (!hasTrigger) {
    ScriptApp.newTrigger('checkNewEmails')
      .timeBased()
      .everyMinutes(5)
      .create();
  }
  
  Logger.log('noPhish Gmail Forwarder set up successfully!');
}

// Main function that checks new emails
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
  
  // Get unread emails from inbox
  const threads = GmailApp.getInboxUnreadCount();
  Logger.log('Unread count: ' + threads);
  
  const emails = GmailApp.getMessagesForInbox();
  Logger.log('Total emails in inbox: ' + emails.length);
  
  // Process up to 10 recent emails
  const toProcess = emails.slice(0, 10);
  
  for (let i = 0; i < toProcess.length; i++) {
    const email = toProcess[i];
    const thread = email.getThread();
    
    // Skip if already processed
    if (thread.hasLabel(label)) {
      continue;
    }
    
    try {
      // Extract email data
      const emailData = {
        sender: email.getFrom(),
        subject: email.getSubject(),
        body: email.getPlainBody().substring(0, 2000),
        timestamp: email.getDate().toISOString()
      };
      
      Logger.log('Processing: ' + email.getSubject() + ' from ' + email.getFrom());
      
      // Send to webhook
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(emailData)
      });
      
      Logger.log('Response: ' + response.getResponseCode() + ' - ' + response.getContentText().substring(0, 200));
      
      // Mark as processed
      thread.addLabel(label);
      thread.markRead();
      
      Logger.log('Processed email: ' + email.getSubject());
      
    } catch (error) {
      Logger.log('Error processing email: ' + error.message);
    }
  }
}

// Manual test function
function testWebhook() {
  const testData = {
    sender: 'test@example.com',
    subject: 'Test Phishing Email',
    body: 'This is a test email with suspicious link: http://fake-bank.com/verify',
    timestamp: new Date().toISOString()
  };
  
  const response = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(testData)
  });
  
  Logger.log('Response: ' + response.getResponseCode());
  Logger.log('Body: ' + response.getContentText());
}
