module.exports = async function(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body || {};
        const fileContent = data.content || data.fileContent || '';
        const fileName = data.fileName || 'unknown';
        
        let score = 0;
        let reasons = [];
        
        const contentLower = fileContent.toLowerCase();

        const suspiciousUrls = ['bit.ly', 'tinyurl', 'login-secure', 'verify-account'];
        
        suspiciousUrls.forEach(url => {
            if (contentLower.includes(url)) {
                score += 2;
                reasons.push('Suspicious URL: ' + url);
            }
        });

        if (contentLower.includes('<form')) {
            score += 2;
            reasons.push('HTML form detected');
        }
        
        if (contentLower.includes('type="password"')) {
            score += 3;
            reasons.push('Password input field');
        }
        
        if (contentLower.includes('<script')) {
            score += 2;
            reasons.push('JavaScript detected');
        }
        
        if (contentLower.includes('<iframe')) {
            score += 2;
            reasons.push('Inline frame detected');
        }

        const phishingKeywords = ['urgent', 'immediately', 'verify', 'confirm', 'update', 'suspend', 'locked', 'unauthorized', 'click here', 'password', 'credit card', 'bank account'];
        
        phishingKeywords.forEach(keyword => {
            if (contentLower.includes(keyword)) {
                score += 1;
                reasons.push('Keyword: ' + keyword);
            }
        });

        const isPhishing = score >= 3;

        return res.status(200).json({
            fileName: fileName,
            is_phishing: isPhishing,
            score: Math.min(score, 10),
            reasons: reasons,
            recommendations: isPhishing ? [
                'DO NOT open this file',
                'Contains phishing indicators',
                'Delete immediately'
            ] : [
                'No threats detected',
                'File appears safe'
            ]
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
