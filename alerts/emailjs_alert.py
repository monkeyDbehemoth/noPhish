import os
import requests

SERVICE_ID = os.getenv("EMAILJS_SERVICE_ID", "service_80fn7ge")
TEMPLATE_ID = os.getenv("EMAILJS_TEMPLATE_ID", "template_k3z097y")
PUBLIC_KEY = os.getenv("EMAILJS_PUBLIC_KEY", "")


def send_emailjs_alert(message, result, entry):
    sender = message.get("From", "Unknown")
    subject = message.get("Subject", "No Subject")
    timestamp = entry.get("timestamp", "")
    score = result.get("total_score", 0)

    reasons_html = ""
    for r in result.get("url_layer", {}).get("reasons", []):
        reasons_html += f"<li>URL: {r}</li>"
    for r in result.get("html_layer", {}).get("reasons", []):
        reasons_html += f"<li>HTML: {r}</li>"
    for r in result.get("ml_layer", {}).get("matched_features", []):
        reasons_html += f"<li>ML: matched '{r}'</li>"

    body = message.get_payload(decode=True)
    if body:
        try:
            email_preview = body.decode("utf-8", errors="ignore")[:500]
        except:
            email_preview = str(body)[:500]
    else:
        email_preview = "No email body available"

    template_params = {
        "sender": sender,
        "subject": subject,
        "timestamp": timestamp,
        "score": score,
        "detection_reasons": reasons_html,
        "email_preview": email_preview.replace("\n", "<br>"),
    }

    data = {
        "service_id": SERVICE_ID,
        "template_id": TEMPLATE_ID,
        "user_id": PUBLIC_KEY if PUBLIC_KEY else "YOUR_PUBLIC_KEY",
        "template_params": template_params,
    }

    try:
        response = requests.post(
            "https://api.emailjs.com/api/v1.0/email/send",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            print(f"[+] EmailJS alert sent successfully")
            return True
        else:
            print(f"[!] EmailJS error: {response.text}")
            return False
    except Exception as e:
        print(f"[!] Failed to send EmailJS alert: {e}")
        return False
