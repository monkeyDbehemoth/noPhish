#!/usr/bin/env python3
"""
noPhish - 3-Layer Phishing Detection System
Main entry point with multiple modes
"""

import os
import sys

def print_banner():
    banner = r"""
              __________.__    .__       .__     
   ____   ____\______   \  |__ |__| _____|  |__  
  /    \ /  _ \|     ___/  |  \|  |/  ___/  |  \ 
 |   |  (  <_> )    |   |   Y  \  |\___ \|   Y  \
 |___|  /\____/|____|   |___|  /__/____  >___|  /
      \/                     \/        \/     \/
    """
    print(banner)
    print("[+] noPhish - 3-Layer Phishing Detection System")
    print()


def smtp_mode():
    """Start SMTP listener mode"""
    from smtp_listener.smtp_server import start_smtp_server
    print("[*] Running in SMTP Listener mode")
    print("[*] Listening on 127.0.0.1:2525")
    print("[*] Configure your email forwarder to send emails to this port\n")
    start_smtp_server()


def imap_mode():
    """Start IMAP email fetcher mode"""
    from imap_fetcher import IMAPEmailFetcher
    
    print("[*] Running in IMAP Email Fetcher mode")
    
    email = os.getenv('GMAIL_EMAIL')
    password = os.getenv('GMAIL_APP_PASSWORD')
    interval = int(os.getenv('POLL_INTERVAL', '60'))
    
    if not email or not password:
        print("[-] Error: Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables")
        print("\n    Setup:")
        print("    export GMAIL_EMAIL=your-email@gmail.com")
        print("    export GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx")
        print("    python main.py --mode imap")
        print("\n    Or add to .env file:")
        print("    GMAIL_EMAIL=your-email@gmail.com")
        print("    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx")
        sys.exit(1)
    
    fetcher = IMAPEmailFetcher(email, password)
    fetcher.start_polling(interval)


def main():
    import argparse
    
    print_banner()
    
    parser = argparse.ArgumentParser(description='noPhish - 3-Layer Phishing Detection System')
    parser.add_argument('--mode', '-m', 
                       choices=['smtp', 'imap', 'both'],
                       default='smtp',
                       help='Run mode: smtp (SMTP listener), imap (Gmail IMAP), or both (default: smtp)')
    parser.add_argument('--interval', '-i', type=int, default=60,
                       help='IMAP polling interval in seconds (default: 60)')
    
    args = parser.parse_args()
    
    if args.mode == 'smtp':
        smtp_mode()
    elif args.mode == 'imap':
        os.environ['POLL_INTERVAL'] = str(args.interval)
        imap_mode()
    elif args.mode == 'both':
        print("[*] Running both SMTP and IMAP modes\n")
        import threading
        imap_thread = threading.Thread(target=imap_mode, daemon=True)
        imap_thread.start()
        smtp_mode()


if __name__ == "__main__":
    main()
