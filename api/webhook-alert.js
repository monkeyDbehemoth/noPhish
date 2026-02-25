module.exports = async function(req, res) {
    const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body || {};
        
        const sender = data.sender || data.from || 'Unknown';
        const subject = data.subject || 'No Subject';
        const emailBody = data.body || data.email_body || '';
        
        const phishingKeywords = ['urgent', 'verify', 'login', 'password', 'account suspended', 'click here', 'update', 'confirm', 'bank', 'paypal', 'suspend', 'unusual activity'];
        const suspiciousUrls = ['bit.ly', 'tinyurl', 'login-secure', 'verify-account'];
        
        let isPhishing = false;
        let score = 0;
        let reasons = [];
        
        const lowerBody = (subject + ' ' + emailBody).toLowerCase();
        
        for (const keyword of phishingKeywords) {
            if (lowerBody.includes(keyword)) {
                score += 1;
                reasons.push('Keyword: ' + keyword);
            }
        }
        
        for (const url of suspiciousUrls) {
            if (lowerBody.includes(url)) {
                score += 2;
                reasons.push('Suspicious URL: ' + url);
            }
        }
        
        if (lowerBody.includes('http://') && !lowerBody.includes('https://')) {
            score += 1;
            reasons.push('Insecure HTTP link');
        }
        
        if (lowerBody.includes('password') || lowerBody.includes('enter your password')) {
            score += 2;
            reasons.push('Password request detected');
        }
        
        if (lowerBody.includes('immediately') || lowerBody.includes('24 hours') || lowerBody.includes('48 hours')) {
            score += 1;
            reasons.push('Urgency tactics');
        }
        
        isPhishing = score >= 3;
        
        if (!isPhishing) {
            return res.status(200).json({ 
                message: 'Email analyzed - NOT phishing', 
                score: score 
            });
        }
        
        let emailjsSent = false;
        
        if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
            const reasonsHtml = reasons.map(r => '<li>' + r + '</li>').join('');
            
            const emailjsData = {
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY || '',
                accessToken: EMAILJS_PRIVATE_KEY || '',
                template_params: {
                    sender: sender,
                    subject: subject,
                    timestamp: new Date().toISOString(),
                    score: score,
                    detection_reasons: reasonsHtml || '<li>No details</li>',
                    email_preview: emailBody.substring(0, 500).replace(/\n/g, '<br>')
                }
            };

            try {
                const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailjsData)
                });

                if (response.ok) {
                    emailjsSent = true;
                }
            } catch (e) {
                console.log('EmailJS error:', e.message);
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            message: emailjsSent ? 'Phishing alert sent!' : 'Phishing detected',
            emailjs_sent: emailjsSent,
            analysis: { is_phishing: isPhishing, score: score, reasons: reasons }
        });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
