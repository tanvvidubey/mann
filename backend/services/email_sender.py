import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from .email_templates import verification_email, welcome_email, pin_change_email

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@mann.local")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _send(to: str, subject: str, html_body: str) -> None:
    if not SMTP_HOST or not SMTP_USER:
        print(f"[Email not sent - no SMTP] To: {to} Subject: {subject}")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        if SMTP_PORT in (587, 465):
            server.starttls()
        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to, msg.as_string())


def send_verification_email(to: str, name: str, token: str) -> None:
    url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = verification_email(url, name)
    _send(to, "Verify your email — Mann", html)


def send_welcome_email(to: str, name: str) -> None:
    html = welcome_email(name)
    _send(to, "Welcome to Mann", html)


def send_pin_change_email(to: str, name: str, token: str) -> None:
    url = f"{FRONTEND_URL}/change-pin?token={token}"
    html = pin_change_email(url, name)
    _send(to, "Change your PIN — Mann", html)
