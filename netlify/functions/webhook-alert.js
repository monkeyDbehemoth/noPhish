exports.handler = async (event, context) => {
    const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, ALERT_EMAIL } = process.env;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        
        const sender = data.sender || data.from || 'Unknown';
        const subject = data.subject || 'No Subject';
        const score = data.total_score || 0;
        const isPhishing = data.is_phishing || false;

        if (!isPhishing) {
            return { statusCode: 200, body: JSON.stringify({ message: 'Not phishing, skipping alert' }) };
        }

        const reasonsHtml = [
            ...(data.url_reasons || []).map(r => `<li>URL: ${r}</li>`),
            ...(data.html_reasons || []).map(r => `<li>HTML: ${r}</li>`),
            ...(data.ml_reasons || []).map(r => `<li>ML: ${r}</li>`)
        ].join('');

        const emailjsData = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                sender: sender,
                subject: subject,
                timestamp: new Date().toISOString(),
                score: score,
                detection_reasons: reasonsHtml || '<li>No details</li>',
                email_preview: (data.email_body || 'No body').substring(0, 500)
            }
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailjsData)
        });

        if (response.ok) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Alert sent' })
            };
        } else {
            const error = await response.text();
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'EmailJS error', details: error })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
