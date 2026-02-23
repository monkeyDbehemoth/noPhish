const https = require('https');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        
        const emailData = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            sender: data.sender || data.from || 'Unknown',
            subject: data.subject || 'No Subject',
            is_phishing: data.is_phishing || false,
            total_score: data.total_score || 0,
            url_score: data.url_score || 0,
            html_score: data.html_score || 0,
            ml_score: data.ml_score || 0,
            url_reasons: data.url_reasons || [],
            html_reasons: data.html_reasons || [],
            ml_reasons: data.ml_reasons || [],
            email_body: data.email_body || ''
        };

        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'netlify',
                port: 80,
                path: '/datastore/emails',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, body }));
            });
            
            req.on('error', reject);
            req.write(JSON.stringify(emailData));
            req.end();
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, email: emailData })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
