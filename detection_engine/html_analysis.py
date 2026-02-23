from bs4 import BeautifulSoup

def analyze_html(body):
    score = 0
    reasons = []

    if "<form" in body.lower():
        score += 2
        reasons.append("HTML form detected")

        soup = BeautifulSoup(body, "html.parser")
        inputs = soup.find_all("input")

        for i in inputs:
            if i.get("type") == "password":
                score += 2
                reasons.append("Password field detected")

    if "<script" in body.lower():
        score += 1
        reasons.append("Script tag detected")

    return {
        "score": score,
        "reasons": reasons
    }
