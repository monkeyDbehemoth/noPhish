PHISH_WORDS = [
    "urgent",
    "verify",
    "login",
    "password",
    "account suspended",
    "click immediately",
    "reset",
    "facebook",
    "verification"
]

def ml_score(body):
    score = 0
    matched = []

    text = body.lower()

    for word in PHISH_WORDS:
        if word in text:
            score += 1
            matched.append(word)

    return {
        "score": score,
        "matched_features": matched
    }
