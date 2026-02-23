import sys
sys.path.append('/home/gori/noPhish')

from email.message import EmailMessage
from detection_engine.detector import run_detection

# Recreate the test email
with open("test_samples/fake_login.html") as f:
    html_content = f.read()

msg = EmailMessage()
msg["From"] = "attacker@test.com"
msg["To"] = "victim@test.com"
msg["Subject"] = "Security Alert: Login Required"

msg.set_content("Please login to continue.")
msg.add_alternative(html_content, subtype="html")

# Run detection
result = run_detection(msg)
print("Detection Result:")
print(f"Phishing: {result['phishing']}")
print(f"Total Score: {result['total_score']}")
print(f"URL Layer: {result['url_layer']}")
print(f"HTML Layer: {result['html_layer']}")
print(f"ML Layer: {result['ml_layer']}")