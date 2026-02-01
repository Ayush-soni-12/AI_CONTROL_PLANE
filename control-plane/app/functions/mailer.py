from fastapi_mail import ConnectionConfig
from fastapi_mail import FastMail, MessageSchema, MessageType
from app.config import settings
from pathlib import Path

# Get the directory where this file is located
TEMPLATE_FOLDER = Path(__file__).parent

mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_MAIL,
    MAIL_PASSWORD=settings.SMTP_PASS,
    MAIL_FROM=settings.SMTP_MAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=TEMPLATE_FOLDER,
)



async def send_alert_email(
    to_email: str,
    subject: str,
    context: dict,
):
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        template_body=context,
        subtype=MessageType.html,
    )

    fm = FastMail(mail_conf)
    await fm.send_message(message, template_name="template.html")


