import json
import os
import requests
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5000")


def log_email(message, result):
    entry = {
        "time": datetime.utcnow().isoformat(),
        "from": message["From"],
        "subject": message["Subject"],
        "analysis": result
    }

    with open(LOG_DIR / "email_logs.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")

    save_to_dashboard(message, result)

    return entry


def save_to_dashboard(message, result):
    try:
        body = message.get_payload(decode=True)
        if body:
            try:
                email_body = body.decode("utf-8", errors="ignore")
            except:
                email_body = str(body)
        else:
            email_body = ""

        url_reasons = result.get("url_layer", {}).get("reasons", [])
        html_reasons = result.get("html_layer", {}).get("reasons", [])
        ml_reasons = result.get("ml_layer", {}).get("matched_features", [])

        data = {
            "sender": message.get("From", ""),
            "subject": message.get("Subject", ""),
            "is_phishing": result.get("phishing", False),
            "total_score": result.get("total_score", 0),
            "url_score": result.get("url_layer", {}).get("score", 0),
            "html_score": result.get("html_layer", {}).get("score", 0),
            "ml_score": result.get("ml_layer", {}).get("score", 0),
            "url_reasons": url_reasons,
            "html_reasons": html_reasons,
            "ml_reasons": ml_reasons,
            "email_body": email_body[:5000]
        }

        response = requests.post(
            f"{DASHBOARD_URL}/api/add_email",
            json=data,
            timeout=5
        )
        if response.status_code == 200:
            print(f"[+] Saved to dashboard")
        else:
            print(f"[!] Dashboard save failed: {response.text}")
    except requests.exceptions.ConnectionError:
        print(f"[!] Could not connect to dashboard (is it running?)")
    except Exception as e:
        print(f"[!] Dashboard save error: {e}")
