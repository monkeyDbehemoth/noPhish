// URL Scanner Function
const https = require('https');
const { URL } = require('url');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const url = data.url || data.urlToScan;
        
        if (!url) {
            return { statusCode: 400, body: JSON.stringify({ error: 'URL is required' }) };
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL format' }) };
        }

        // Detection
        let score = 0;
        let reasons = [];
        const urlLower = url.toLowerCase();

        // Layer 1: URL Analysis
        // Check for suspicious keywords in URL
        const suspiciousKeywords = [
            'login', 'signin', 'verify', 'secure', 'account', 'update',
            'confirm', 'bank', 'paypal', 'password', 'credential',
            'suspend', 'unusual', 'activity', 'confirm', 'validate'
        ];
        
        suspiciousKeywords.forEach(keyword => {
            if (urlLower.includes(keyword)) {
                score += 1;
                reasons.push({ layer: 'URL', reason: `Suspicious keyword: "${keyword}"` });
            }
        });

        // Check for URL shorteners
        const urlShorteners = ['bit.ly', 'tinyurl', 'goo.gl', 't.co', 'ow.ly', 'is.gd'];
        urlShorteners.forEach(shortener => {
            if (urlLower.includes(shortener)) {
                score += 2;
                reasons.push({ layer: 'URL', reason: `URL shortener detected: ${shortener}` });
            }
        });

        // Check for IP address in URL
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/;
        if (ipPattern.test(url)) {
            score += 3;
            reasons.push({ layer: 'URL', reason: 'IP address used instead of domain' });
        }

        // Check for HTTP (insecure)
        if (url.startsWith('http://')) {
            score += 1;
            reasons.push({ layer: 'URL', reason: 'Insecure HTTP connection' });
        }

        // Check for excessive subdomains
        const hostname = parsedUrl.hostname;
        const subdomainCount = hostname.split('.').length - 1;
        if (subdomainCount > 3) {
            score += 2;
            reasons.push({ layer: 'URL', reason: `Excessive subdomains (${subdomainCount})` });
        }

        // Check for suspicious TLDs
        const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top'];
        suspiciousTLDs.forEach(tld => {
            if (hostname.endsWith(tld)) {
                score += 1;
                reasons.push({ layer: 'URL', reason: `Suspicious TLD: ${tld}` });
            }
        });

        // Check for base64 in URL
        if (urlLower.includes('base64') || urlLower.includes('%3d')) {
            score += 3;
            reasons.push({ layer: 'URL', reason: 'Potential encoded/obfuscated content' });
        }

        // Check for @ symbol (credential harvesting)
        if (url.includes('@')) {
            score += 3;
            reasons.push({ layer: 'URL', reason: 'Credentials in URL (@ symbol)' });
        }

        // Layer 2: Try to fetch and analyze HTML
        let htmlAnalysis = { score: 0, reasons: [] };
        
        try {
            const htmlContent = await fetchURL(url);
            if (htmlContent) {
                // Check for login forms
                if (htmlContent.includes('<form') || htmlContent.includes('password')) {
                    htmlAnalysis.score += 2;
                    htmlAnalysis.reasons.push('Login form detected');
                }
                
                // Check for script tags
                if (htmlContent.includes('<script')) {
                    htmlAnalysis.score += 1;
                    htmlAnalysis.reasons.push('JavaScript detected');
                }
                
                // Check for external links
                const linkMatches = htmlContent.match(/href=["'](http[^"']+)["']/g);
                if (linkMatches && linkMatches.length > 10) {
                    htmlAnalysis.score += 1;
                    htmlAnalysis.reasons.push(`Many external links (${linkMatches.length})`);
                }

                // Add HTML analysis to reasons
                htmlAnalysis.reasons.forEach(r => {
                    reasons.push({ layer: 'HTML', reason: r });
                });
                score += htmlAnalysis.score;
            }
        } catch (e) {
            reasons.push({ layer: 'Analysis', reason: 'Could not fetch URL content for deeper analysis' });
        }

        // Layer 3: ML-style pattern matching (simplified)
        const phishingPatterns = [
            'verify your account', 'update your payment', 'confirm your identity',
            'click here to verify', 'immediate action required', 'account suspended',
            'unusual activity detected', 'security alert', 'confirm your password'
        ];

        phishingPatterns.forEach(pattern => {
            if (urlLower.includes(pattern)) {
                score += 1;
                reasons.push({ layer: 'ML', reason: `Phishing pattern: "${pattern}"` });
            }
        });

        // Final determination
        const isPhishing = score >= 3;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                is_phishing: isPhishing,
                score: Math.min(score, 10),
                reasons: reasons,
                analysis: {
                    url_layer: {
                        score: reasons.filter(r => r.layer === 'URL').length,
                        reasons: reasons.filter(r => r.layer === 'URL').map(r => r.reason)
                    },
                    html_layer: {
                        score: htmlAnalysis.score,
                        reasons: htmlAnalysis.reasons
                    },
                    ml_layer: {
                        score: reasons.filter(r => r.layer === 'ML').length,
                        matched_features: reasons.filter(r => r.layer === 'ML').map(r => r.reason)
                    }
                },
                recommendations: isPhishing ? [
                    'Do not enter any credentials on this page',
                    'Do not download any files from this URL',
                    'Report this URL as phishing',
                    'Do not share this with others'
                ] : [
                    'This URL appears relatively safe',
                    'However, always verify the domain',
                    'Never enter sensitive information on unknown sites'
                ]
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const req = protocol.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
                if (data.length > 50000) { // Limit to 50KB
                    req.destroy();
                }
            });
            res.on('end', () => resolve(data));
        });
        
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
    });
}

const http = require('http');
