from detection_engine.url_analysis import analyze_urls
from detection_engine.html_analysis import analyze_html
from detection_engine.ml_analysis import ml_score


def extract_body(message):
    body = ""

    if message.is_multipart():
        for part in message.walk():
            if part.get_content_type() in ["text/plain", "text/html"]:
                body += part.get_content()
    else:
        body = message.get_content()

    return body


def run_detection(message):
    subject = message.get('Subject', '')
    body = extract_body(message)
    full_text = subject + ' ' + body

    url_result = analyze_urls(full_text)
    html_result = analyze_html(body)
    ml_result = ml_score(full_text)

    total_score = (
        url_result["score"]
        + html_result["score"]
        + ml_result["score"]
    )

    return {
        "phishing": total_score >= 5,
        "total_score": total_score,
        "url_layer": url_result,
        "html_layer": html_result,
        "ml_layer": ml_result,
    }
