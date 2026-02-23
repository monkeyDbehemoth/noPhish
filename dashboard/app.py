import os
import json
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SECRET_KEY'] = 'nophish-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nophish.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class EmailLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    sender = db.Column(db.String(500))
    subject = db.Column(db.String(500))
    is_phishing = db.Column(db.Boolean, default=False)
    total_score = db.Column(db.Integer, default=0)
    url_score = db.Column(db.Integer, default=0)
    html_score = db.Column(db.Integer, default=0)
    ml_score = db.Column(db.Integer, default=0)
    url_reasons = db.Column(db.Text)
    html_reasons = db.Column(db.Text)
    ml_reasons = db.Column(db.Text)
    email_body = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'sender': self.sender,
            'subject': self.subject,
            'is_phishing': self.is_phishing,
            'total_score': self.total_score,
            'url_score': self.url_score,
            'html_score': self.html_score,
            'ml_score': self.ml_score,
            'url_reasons': json.loads(self.url_reasons) if self.url_reasons else [],
            'html_reasons': json.loads(self.html_reasons) if self.html_reasons else [],
            'ml_reasons': json.loads(self.ml_reasons) if self.ml_reasons else [],
        }


def init_db():
    with app.app_context():
        db.create_all()


@app.route('/')
def index():
    total_emails = EmailLog.query.count()
    phishing_emails = EmailLog.query.filter_by(is_phishing=True).count()
    clean_emails = total_emails - phishing_emails
    
    recent_phishing = EmailLog.query.filter_by(is_phishing=True).order_by(EmailLog.timestamp.desc()).limit(5).all()
    
    stats = {
        'total': total_emails,
        'phishing': phishing_emails,
        'clean': clean_emails,
        'phishing_rate': round((phishing_emails / total_emails * 100), 1) if total_emails > 0 else 0
    }
    
    return render_template('index.html', stats=stats, recent_phishing=recent_phishing)


@app.route('/emails')
def emails():
    page = request.args.get('page', 1, type=int)
    filter_type = request.args.get('filter', 'all')
    search = request.args.get('search', '')
    
    query = EmailLog.query
    
    if filter_type == 'phishing':
        query = query.filter_by(is_phishing=True)
    elif filter_type == 'clean':
        query = query.filter_by(is_phishing=False)
    
    if search:
        query = query.filter(
            (EmailLog.sender.contains(search)) | 
            (EmailLog.subject.contains(search))
        )
    
    emails = query.order_by(EmailLog.timestamp.desc()).paginate(page=page, per_page=20)
    
    return render_template('emails.html', emails=emails, filter_type=filter_type, search=search)


@app.route('/email/<int:email_id>')
def email_detail(email_id):
    email = EmailLog.query.get_or_404(email_id)
    return render_template('detail.html', email=email)


@app.route('/delete/<int:email_id>', methods=['POST'])
def delete_email(email_id):
    email = EmailLog.query.get_or_404(email_id)
    db.session.delete(email)
    db.session.commit()
    flash('Email deleted successfully', 'success')
    return redirect(url_for('emails'))


@app.route('/stats')
def stats():
    from sqlalchemy import func
    
    daily_stats = db.session.query(
        func.date(EmailLog.timestamp).label('date'),
        func.count(EmailLog.id).label('total'),
        func.sum(db.case((EmailLog.is_phishing == True, 1), else_=0)).label('phishing')
    ).group_by(func.date(EmailLog.timestamp)).order_by(func.date(EmailLog.timestamp).desc()).limit(30).all()
    
    data = {
        'dates': [str(s.date) for s in daily_stats],
        'total': [s.total for s in daily_stats],
        'phishing': [s.phishing for s in daily_stats]
    }
    
    return render_template('stats.html', data=data)


@app.route('/api/add_email', methods=['POST'])
def api_add_email():
    data = request.get_json()
    
    email = EmailLog(
        sender=data.get('sender'),
        subject=data.get('subject'),
        is_phishing=data.get('is_phishing', False),
        total_score=data.get('total_score', 0),
        url_score=data.get('url_score', 0),
        html_score=data.get('html_score', 0),
        ml_score=data.get('ml_score', 0),
        url_reasons=json.dumps(data.get('url_reasons', [])),
        html_reasons=json.dumps(data.get('html_reasons', [])),
        ml_reasons=json.dumps(data.get('ml_reasons', [])),
        email_body=data.get('email_body', '')
    )
    
    db.session.add(email)
    db.session.commit()
    
    return {'status': 'success', 'id': email.id}


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
