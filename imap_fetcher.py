#!/usr/bin/env python3
"""
noPhish IMAP Email Fetcher
Connects to Gmail via IMAP and polls for new emails
"""

import os
import imaplib
import email
import json
import time
import ssl
from datetime import datetime
from detection_engine.detector import run_detection
from alerts.alert import send_alert
from logging_reporting.logger import log_email
from alerts.emailjs_alert import send_emailjs_alert
import requests

GMAIL_IMAP = "imap.gmail.com"
PORT = 993

class IMAPEmailFetcher:
    def __init__(self, email_address, app_password):
        self.email_address = email_address
        self.app_password = app_password
        self.connection = None
        self.processed_ids = set()
        self.load_processed_ids()
        
    def load_processed_ids(self):
        """Load previously processed email IDs from file"""
        try:
            if os.path.exists('processed_emails.json'):
                with open('processed_emails.json', 'r') as f:
                    self.processed_ids = set(json.load(f))
        except Exception as e:
            print(f"[-] Error loading processed IDs: {e}")
            
    def save_processed_ids(self):
        """Save processed email IDs to file"""
        try:
            with open('processed_emails.json', 'w') as f:
                json.dump(list(self.processed_ids), f)
        except Exception as e:
            print(f"[-] Error saving processed IDs: {e}")
            
    def connect(self):
        """Connect to Gmail IMAP server"""
        try:
            print(f"[*] Connecting to {GMAIL_IMAP}...")
            
            context = ssl.create_default_context()
            self.connection = imaplib.IMAP4_SSL(host=GMAIL_IMAP, port=PORT, ssl_context=context)
            
            self.connection.login(self.email_address, self.app_password)
            print(f"[+] Logged in as {self.email_address}")
            return True
            
        except imaplib.IMAP4.error as e:
            print(f"[-] IMAP Error: {e}")
            return False
        except Exception as e:
            print(f"[-] Connection Error: {e}")
            return False
            
    def disconnect(self):
        """Disconnect from IMAP server"""
        if self.connection:
            try:
                self.connection.logout()
                print("[*] Disconnected from Gmail")
            except:
                pass
                
    def get_unread_emails(self):
        """Get all unread emails from inbox"""
        try:
            self.connection.select('INBOX')
            
            status, messages = self.connection.search(None, 'UNSEEN')
            
            if status != 'OK':
                return []
                
            email_ids = messages[0].split()
            print(f"[*] Found {len(email_ids)} unread emails")
            
            emails = []
            for email_id in email_ids:
                if email_id.decode() in self.processed_ids:
                    continue
                    
                status, msg_data = self.connection.fetch(email_id, '(RFC822)')
                
                if status != 'OK':
                    continue
                    
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg_content = response_part[1]
                        msg = email.message_from_bytes(msg_content)
                        
                        email_data = {
                            'id': email_id.decode(),
                            'from': msg['From'],
                            'subject': msg['Subject'],
                            'date': msg['Date'],
                            'message': msg
                        }
                        
                        emails.append(email_data)
                        self.processed_ids.add(email_id.decode())
                        
            return emails
            
        except imaplib.IMAP4.error as e:
            print(f"[-] Error fetching emails: {e}")
            return []
        except Exception as e:
            print(f"[-] Error: {e}")
            return []
            
    def extract_email_body(self, msg):
        """Extract plain text and HTML body from email"""
        body = ""
        html_body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get('Content-Disposition'))
                
                if content_type == 'text/plain' and 'attachment' not in content_disposition:
                    try:
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except:
                        pass
                        
                if content_type == 'text/html' and 'attachment' not in content_disposition:
                    try:
                        html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                body = str(msg.get_payload())
                
        return body or html_body or ""
        
    def process_email(self, email_data):
        """Process a single email through the detection engine"""
        msg = email_data['message']
        body = self.extract_email_body(msg)
        
        print(f"\n[*] Processing email from: {email_data['from']}")
        print(f"[*] Subject: {email_data['subject']}")
        
        fake_message = type('obj', (object,), {
            '__getitem__': lambda self, key: {
                'From': email_data['from'],
                'Subject': email_data['subject']
            }.get(key, ''),
            'get': lambda self, key, default='': {
                'From': email_data['from'],
                'Subject': email_data['subject']
            }.get(key, default),
            'get_payload': lambda self, decode=False: body if not decode else body.encode()
        })()
        
        result = run_detection(fake_message)
        
        print(f"[*] Detection result: phishing={result['phishing']}, score={result['total_score']}")
        
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'from': email_data['from'],
            'subject': email_data['subject'],
            'analysis': result
        }
        
        with open('logs/email_logs.jsonl', 'a') as f:
            f.write(json.dumps(entry) + '\n')
            
        if result['phishing']:
            print(f"[!] PHISHING DETECTED! Score: {result['total_score']}/10")
            send_alert(fake_message, result, entry)
            send_emailjs_alert(fake_message, result, entry)
            
            self.send_to_webhook(email_data, result)
        else:
            print(f"[+] Email is clean. Score: {result['total_score']}/10")
            
        return result
        
    def send_to_webhook(self, email_data, result):
        """Send email data to webhook for dashboard update"""
        webhook_url = os.getenv('DASHBOARD_WEBHOOK', 'http://localhost:5000/api/add_email')
        
        try:
            payload = {
                'sender': email_data['from'],
                'subject': email_data['subject'],
                'is_phishing': result['phishing'],
                'total_score': result['total_score'],
                'url_score': result.get('url_layer', {}).get('score', 0),
                'html_score': result.get('html_layer', {}).get('score', 0),
                'ml_score': result.get('ml_layer', {}).get('score', 0),
                'url_reasons': result.get('url_layer', {}).get('reasons', []),
                'html_reasons': result.get('html_layer', {}).get('reasons', []),
                'ml_reasons': result.get('ml_layer', {}).get('matched_features', []),
                'email_body': self.extract_email_body(email_data['message'])[:5000]
            }
            
            requests.post(webhook_url, json=payload, timeout=5)
            print(f"[+] Sent to dashboard")
            
        except Exception as e:
            print(f"[-] Failed to send to webhook: {e}")
            
    def start_polling(self, interval=60):
        """Start polling for new emails"""
        print("\n" + "="*50)
        print("  noPhish IMAP Email Fetcher")
        print("="*50)
        print(f"[*] Polling every {interval} seconds")
        print(f"[*] Press Ctrl+C to stop")
        print("="*50 + "\n")
        
        while True:
            try:
                if not self.connection:
                    if not self.connect():
                        print(f"[-] Retrying in 30 seconds...")
                        time.sleep(30)
                        continue
                        
                emails = self.get_unread_emails()
                
                for email_data in emails:
                    self.process_email(email_data)
                    
                self.save_processed_ids()
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n\n[*] Stopping IMAP fetcher...")
                self.save_processed_ids()
                self.disconnect()
                break
                
            except imaplib.IMAP4.error as e:
                print(f"[-] IMAP Error: {e}")
                print("[*] Reconnecting in 30 seconds...")
                self.connection = None
                time.sleep(30)
                
            except Exception as e:
                print(f"[-] Error: {e}")
                time.sleep(interval)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='noPhish IMAP Email Fetcher')
    parser.add_argument('--email', '-e', help='Gmail address')
    parser.add_argument('--password', '-p', help='Gmail App Password')
    parser.add_argument('--interval', '-i', type=int, default=60, help='Polling interval in seconds (default: 60)')
    parser.add_argument('--env', action='store_true', help='Use environment variables')
    
    args = parser.parse_args()
    
    if args.env or not args.email:
        email = os.getenv('GMAIL_EMAIL')
        password = os.getenv('GMAIL_APP_PASSWORD')
        
        if not email or not password:
            print("[-] Please provide email and password or set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables")
            print("\nUsage:")
            print("  export GMAIL_EMAIL=your-email@gmail.com")
            print("  export GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx")
            print("  python imap_fetcher.py --env")
            return
    else:
        email = args.email
        password = args.password
        
    fetcher = IMAPEmailFetcher(email, password)
    fetcher.start_polling(args.interval)


if __name__ == '__main__':
    main()
