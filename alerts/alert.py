import json
from rich import print

from alerts.emailjs_alert import send_emailjs_alert


def send_alert(message, result, entry):
    print("\n[bold red]🚨 PHISHING EMAIL DETECTED 🚨[/bold red]")
    print(f"From: {message['From']}")
    print(f"Subject: {message['Subject']}")
    print(f"Total Score: {result['total_score']}")

    print("\n[bold]Detection Reasons:[/bold]")

    for r in result["url_layer"]["reasons"]:
        print(f" - [yellow]URL[/yellow]: {r}")

    for r in result["html_layer"]["reasons"]:
        print(f" - [cyan]HTML[/cyan]: {r}")

    for r in result["ml_layer"]["matched_features"]:
        print(f" - [magenta]ML[/magenta]: matched '{r}'")

    print("\n[bold]Log Entry:[/bold]")
    print(json.dumps(entry, indent=2))

    send_emailjs_alert(message, result, entry)
