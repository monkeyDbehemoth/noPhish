import re

BLACKLIST = ["login-secure", "verify-account", "bit.ly", "tinyurl"]

def analyze_urls(body):
    urls = re.findall(r"http[s]?://\S+", body.lower())
    score = 0
    reasons = []

    for url in urls:
        for bad in BLACKLIST:
            if bad in url:
                score += 2
                reasons.append(f"Blacklisted keyword in URL: {bad}")

        if url.count(".") > 4:
            score += 1
            reasons.append("Suspicious long URL")

        if re.search(r'[A-Za-z0-9+/=]{20,}', url):
            score += 2
            reasons.append("Possible base64 encoding detected in URL")

    return {
        "urls": urls,
        "score": score,
        "reasons": reasons
    }
