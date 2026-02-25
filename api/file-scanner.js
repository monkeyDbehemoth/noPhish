// File Scanner Function
const fs = require('fs');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const fileContent = data.content || data.fileContent;
        const fileName = data.fileName || 'unknown';
        
        if (!fileContent) {
            return { statusCode: 400, body: JSON.stringify({ error: 'File content is required' }) };
        }

        let score = 0;
        let reasons = [];
        
        // Decode base64 if present
        let content = fileContent;
        try {
            if (content.startsWith('base64:')) {
                content = Buffer.from(content.slice(7), 'base64').toString('utf-8');
            }
        } catch (e) {}

        const contentLower = content.toLowerCase();

        // Layer 1: URL/Link Analysis in File
        const suspiciousUrls = [
            'bit.ly', 'tinyurl', 'goo.gl', 't.co',
            'login-secure', 'verify-account', 'account-verify'
        ];
        
        suspiciousUrls.forEach(url => {
            if (contentLower.includes(url)) {
                score += 2;
                reasons.push({ layer: 'URL', reason: `Suspicious URL: ${url}` });
            }
        });

        // Check for HTTP links
        const httpLinks = content.match(/http:\/\/[^\s"']g);
        if+/ (httpLinks && httpLinks.length > 0) {
            score += 1;
            reasons.push({ layer: 'URL', reason: `${httpLinks.length} insecure HTTP links found` });
        }

        // Layer 2: HTML Analysis
        // Check for forms
        if (contentLower.includes('<form')) {
            score += 2;
            reasons.push({ layer: 'HTML', reason: 'HTML form detected' });
        }
        
        if (contentLower.includes('type="password"') || contentLower.includes('type=\'password\'')) {
            score += 3;
            reasons.push({ layer: 'HTML', reason: 'Password input field detected' });
        }
        
        if (contentLower.includes('<script')) {
            score += 2;
            reasons.push({ layer: 'HTML', reason: 'JavaScript script tags detected' });
        }
        
        if (contentLower.includes('<iframe')) {
            score += 2;
            reasons.push({ layer: 'HTML', reason: 'Inline frame (iframe) detected' });
        }
        
        if (contentLower.includes('onerror=') || contentLower.includes('onclick=')) {
            score += 2;
            reasons.push({ layer: 'HTML', reason: 'Event handlers detected' });
        }
        
        if (contentLower.includes('eval(') || contentLower.includes('document.write')) {
            score += 3;
            reasons.push({ layer: 'HTML', reason: 'Dangerous JavaScript functions detected' });
        }
        
        if (contentLower.includes('base64')) {
            score += 2;
            reasons.push({ layer: 'HTML', reason: 'Base64 encoded content detected' });
        }

        // Layer 3: ML Pattern Matching
        const phishingKeywords = [
            'urgent', 'immediately', 'verify', 'confirm', 'update',
            'suspend', 'locked', 'unauthorized', 'suspicious',
            'click here', 'click below', 'login now',
            'password', 'credit card', 'bank account', 'ssn',
            'social security', 'verify your identity',
            'account will be closed', 'action required',
            'unusual activity', 'security alert'
        ];
        
        phishingKeywords.forEach(keyword => {
            if (contentLower.includes(keyword)) {
                score += 1;
                reasons.push({ layer: 'ML', reason: `Phishing keyword: "${keyword}"` });
            }
        });

        // Check for suspicious email patterns
        if (contentLower.includes('send your password') || 
            contentLower.includes('reply with password') ||
            contentLower.includes('email your password')) {
            score += 5;
            reasons.push({ layer: 'ML', reason: 'Password request detected' });
        }

        // Check for fake login indicators
        if (contentLower.includes('enter your') && contentLower.includes('to continue')) {
            score += 2;
            reasons.push({ layer: 'ML', reason: 'Credential harvesting pattern' });
        }

        // File type specific analysis
        if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
            // Already analyzed as HTML above
            reasons.push({ layer: 'Analysis', reason: `File type: HTML (analyzed above)` });
        } else if (fileName.endsWith('.txt')) {
            reasons.push({ layer: 'Analysis', reason: `File type: Text` });
        } else if (fileName.endsWith('.js')) {
            score += 1;
            reasons.push({ layer: 'Analysis', reason: `File type: JavaScript - extra caution advised` });
        }

        // Final determination
        const isPhishing = score >= 3;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: fileName,
                is_phishing: isPhishing,
                score: Math.min(score, 10),
                reasons: reasons,
                analysis: {
                    url_layer: {
                        score: reasons.filter(r => r.layer === 'URL').length,
                        reasons: reasons.filter(r => r.layer === 'URL').map(r => r.reason)
                    },
                    html_layer: {
                        score: reasons.filter(r => r.layer === 'HTML').length,
                        reasons: reasons.filter(r => r.layer === 'HTML').map(r => r.reason)
                    },
                    ml_layer: {
                        score: reasons.filter(r => r.layer === 'ML').length,
                        matched_features: reasons.filter(r => r.layer === 'ML').map(r => r.reason)
                    }
                },
                recommendations: isPhishing ? [
                    'DO NOT open or execute this file',
                    'This file contains phishing indicators',
                    'Report to your security team',
                    'Delete immediately'
                ] : [
                    'No obvious threats detected',
                    'File appears relatively safe',
                    'Always verify the source before opening'
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
