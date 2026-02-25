module.exports = async function(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body || {};
        const url = data.url || data.urlToScan;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        let score = 0;
        let reasons = [];
        const urlLower = url.toLowerCase();

        const suspiciousKeywords = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm', 'bank', 'paypal', 'password', 'credential', 'suspend', 'unusual', 'activity', 'validate'];
        
        suspiciousKeywords.forEach(keyword => {
            if (urlLower.includes(keyword)) {
                score += 1;
                reasons.push('Keyword: ' + keyword);
            }
        });

        const urlShorteners = ['bit.ly', 'tinyurl', 'goo.gl', 't.co', 'ow.ly', 'is.gd'];
        urlShorteners.forEach(shortener => {
            if (urlLower.includes(shortener)) {
                score += 2;
                reasons.push('URL shortener: ' + shortener);
            }
        });

        if (url.startsWith('http://')) {
            score += 1;
            reasons.push('Insecure HTTP');
        }

        const phishingPatterns = ['verify your account', 'update your payment', 'confirm your identity', 'click here to verify', 'immediate action required', 'account suspended', 'unusual activity detected', 'security alert'];
        
        phishingPatterns.forEach(pattern => {
            if (urlLower.includes(pattern)) {
                score += 1;
                reasons.push('Pattern: ' + pattern);
            }
        });

        const isPhishing = score >= 3;

        return res.status(200).json({
            url: url,
            is_phishing: isPhishing,
            score: Math.min(score, 10),
            reasons: reasons,
            recommendations: isPhishing ? [
                'DO NOT visit this URL',
                'This URL has phishing indicators',
                'Report to your security team'
            ] : [
                'URL appears relatively safe',
                'Always verify the domain'
            ]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
