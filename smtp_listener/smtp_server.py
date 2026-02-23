from aiosmtpd.controller import Controller
from email.parser import BytesParser
from email.policy import default

from detection_engine.detector import run_detection
from logging_reporting.logger import log_email
from alerts.alert import send_alert


BANNER = r"""
             __________.__    .__       .__     
  ____   ____\______   \  |__ |__| _____|  |__  
 /    \ /  _ \|     ___/  |  \|  |/  ___/  |  \ 
|   |  (  <_> )    |   |   Y  \  |\___ \|   Y  \
|___|  /\____/|____|   |___|  /__/____  >___|  /
     \/                     \/        \/     \/
"""


class PhishHandler:
    async def handle_DATA(self, server, session, envelope):
        message = BytesParser(policy=default).parsebytes(envelope.content)

        result = run_detection(message)
        entry = log_email(message, result)

        if result["phishing"]:
            send_alert(message, result, entry)

        return "250 Email processed"


def start_smtp_server():
    print(BANNER)
    print("[+] noPhish – 3-Layer Phishing Detection System")
    print("[+] SMTP Listener running on 127.0.0.1:2525\n")

    controller = Controller(PhishHandler(), hostname="127.0.0.1", port=2525)
    controller.start()

    try:
        while True:
            pass
    except KeyboardInterrupt:
        controller.stop()
