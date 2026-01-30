import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
from .template import html_content

def send_mail(email: str, subject: str, content: str):
    """
    Sends an email using the configured SMTP server.
    
    Args:
        email (str): The recipient's email address.
        subject (str): The subject of the email.
        content (str): The HTML content of the email.
        
    Returns:
        dict: A success message if sent.
        
    Raises:
        Exception: If sending fails.
    """
    # Check if SMTP settings are available
    if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_MAIL, settings.SMTP_PASS]):
        # If settings are missing, we can either raise error or just return. 
        # Given the Node code used process.env without checks (but parseInt), 
        # it would crash/fail if missing. We'll raise to be safe.
        raise ValueError("SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_MAIL, and SMTP_PASS.")

    try:
        # Create the message container
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_MAIL
        msg['To'] = settings.SMTP_MAIL
        msg['Subject'] = subject

        # Attach the content as HTML
        msg.attach(MIMEText(content, 'html'))

        # Create the SMTP session
        # secure: false usually implies starting in plain text then upgrading with TLS
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        
        # Determine if we should use TLS. Node code had requireTLS: true.
        # Generally we always try starttls if available or required.
        server.starttls()
        
        # Login
        server.login(settings.SMTP_MAIL, settings.SMTP_PASS)
        
        # Send the email
        server.send_message(msg)
        
        # Terminate
        server.quit()
        
        return {"status": "success", "message": "Email sent successfully"}

    except Exception as e:
        # Throw an error to handle it in the caller, similar to the Node implementation
        raise Exception(f"Failed to send email: {str(e)}")
