"""HTML email templates matching Mann app UI: cream, terracotta, sage, DM Sans, Lora."""

BASE_STYLES = """
  body { margin: 0; padding: 0; background: #FDF8F3; font-family: 'DM Sans', system-ui, sans-serif; color: #2C2C2C; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px; border: 1px solid rgba(196, 123, 91, 0.2); }
  .brand { font-family: 'Lora', Georgia, serif; font-size: 24px; font-weight: 600; color: #A85C3C; margin-bottom: 8px; }
  .muted { color: #6B6B6B; font-size: 15px; line-height: 1.6; }
  .btn { display: inline-block; padding: 14px 28px; background: #C47B5B; color: #fff !important; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 16px; }
  .btn:hover { background: #A85C3C; }
  .footer { margin-top: 24px; font-size: 13px; color: #8a8a8a; }
  .accent { color: #87A96B; }
  h1 { font-size: 20px; color: #2C2C2C; margin: 0 0 16px; }
"""


def base_html(title: str, body_content: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:wght@400;600&display=swap" rel="stylesheet">
  <style>{BASE_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="brand">Mann</div>
      {body_content}
      <p class="footer">— Your private journal</p>
    </div>
  </div>
</body>
</html>"""


def verification_email(verify_url: str, name: str) -> str:
    body = f"""
      <h1>Verify your email</h1>
      <p class="muted">Hi {name},</p>
      <p class="muted">Please confirm your email address so you can get the most out of Mann.</p>
      <a href="{verify_url}" class="btn">Verify email</a>
      <p class="muted" style="margin-top:20px;font-size:13px;">If you didn't create an account, you can ignore this email.</p>
    """
    return base_html("Verify your email — Mann", body)


def welcome_email(name: str) -> str:
    body = f"""
      <h1>Welcome to Mann</h1>
      <p class="muted">Hi {name},</p>
      <p class="muted">Your private voice journal is ready. Record your thoughts, reflect with gentle insights, and keep everything encrypted and yours.</p>
      <p class="muted"><span class="accent">Tip:</span> Fill in your profile — hobbies, likes, dislikes — so your reflections feel more personal.</p>
    """
    return base_html("Welcome to Mann", body)


def pin_change_email(confirm_url: str, name: str) -> str:
    body = f"""
      <h1>Change your PIN</h1>
      <p class="muted">Hi {name},</p>
      <p class="muted">You requested to change your Mann PIN. Click below to set a new PIN. This link expires in 1 hour.</p>
      <a href="{confirm_url}" class="btn">Set new PIN</a>
      <p class="muted" style="margin-top:20px;font-size:13px;">If you didn't request this, please ignore this email and keep your current PIN.</p>
    """
    return base_html("Change your PIN — Mann", body)
