import smtplib
from email.message import EmailMessage

with open("test_samples/fake_login.html") as f:
    html_content = f.read()

msg = EmailMessage()
msg["From"] = "attacker@test.com"
msg["To"] = "victim@test.com"
msg["Subject"] = "Security Alert: Login Required"

msg.set_content("Please login to continue.")
msg.add_alternative(html_content, subtype="html")

with smtplib.SMTP("127.0.0.1", 2525) as server:
    server.send_message(msg)

print("[+] HTML phishing test email sent")
