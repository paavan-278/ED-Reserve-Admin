import os
import smtplib
from email.message import EmailMessage


class EmailConfigurationError(RuntimeError):
    pass


def send_password_reset_email(to_email: str, otp: str) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    from_email = os.getenv("EMAIL_FROM") or username
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    expiry = os.getenv("OTP_EXPIRE_MINUTES", "5")

    if not host or not username or not password or not from_email:
        raise EmailConfigurationError("SMTP is not configured")

    message = EmailMessage()

    message["Subject"] = "ED Reserve - Password Reset OTP"
    message["From"] = from_email
    message["To"] = to_email

    # Plain text fallback
    message.set_content(
        f"""ED Reserve

Password Reset

Your password reset OTP is: {otp}

This OTP is valid for {expiry} minutes.

If you did not request this password reset, please ignore this email.

ED Reserve
College Resource Booking System
"""
    )

    # HTML version
    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:30px;background:#f4f7fb;
font-family:Arial,sans-serif;">

<div style="max-width:520px;margin:auto;background:white;
border-radius:16px;overflow:hidden;">

    <div style="background:#0b3b91;padding:28px;text-align:center;
    color:white;">

        <div style="font-size:26px;font-weight:bold;">
            ED Reserve
        </div>

        <div style="font-size:13px;margin-top:6px;color:#dbeafe;">
            College Resource Booking System
        </div>

    </div>

    <div style="padding:35px;">

        <h2 style="margin-top:0;color:#172033;">
            Password Reset
        </h2>

        <p style="color:#64748b;line-height:1.6;">
            We received a request to reset your ED Reserve
            account password.
        </p>

        <div style="
            margin:28px 0;
            padding:25px;
            text-align:center;
            background:#f1f6ff;
            border:1px solid #dbeafe;
            border-radius:12px;
        ">

            <div style="
                font-size:12px;
                color:#64748b;
                font-weight:bold;
                letter-spacing:1px;
            ">
                VERIFICATION CODE
            </div>

            <div style="
                margin-top:12px;
                font-size:34px;
                font-weight:bold;
                letter-spacing:7px;
                color:#0b3b91;
            ">
                {otp}
            </div>

            <div style="
                margin-top:12px;
                font-size:13px;
                color:#64748b;
            ">
                Valid for {expiry} minutes
            </div>

        </div>

        <div style="
            padding:14px;
            background:#fff8e7;
            border-left:4px solid #f59e0b;
            border-radius:6px;
            color:#66511a;
            font-size:13px;
            line-height:1.5;
        ">
            <b>Security notice</b><br>
            Never share this OTP with anyone.
            ED Reserve support will never ask for your OTP.
        </div>

        <p style="
            margin-top:25px;
            color:#64748b;
            font-size:14px;
        ">
            If you did not request a password reset,
            you can safely ignore this email.
        </p>

    </div>

    <div style="
        padding:20px;
        text-align:center;
        background:#f8fafc;
        border-top:1px solid #e2e8f0;
        color:#94a3b8;
        font-size:12px;
    ">
        © ED Reserve<br>
        College Resource Booking System
    </div>

</div>

</body>
</html>
"""

    message.add_alternative(html, subtype="html")

    # SAME SMTP FLOW AS YOUR ORIGINAL WORKING CODE
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if use_tls:
            smtp.starttls()

        smtp.login(username, password)
        smtp.send_message(message)