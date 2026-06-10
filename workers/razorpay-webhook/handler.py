import json
import hmac
import hashlib
import os
import psycopg2
from datetime import datetime, timezone, timedelta

def process_webhook(event, context):
    try:
        print("Received webhook event")
        
        # 1. Get Secret and Payload
        webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET')
        db_url = os.environ.get('DATABASE_URL')
        
        if not db_url:
            print("ERROR: DATABASE_URL not set")
            return {"statusCode": 500, "body": "Database not configured"}
            
        body_str = event.get('body') or '{}'
        headers = event.get('headers') or {}
        
        # API Gateway headers are sometimes lowercased
        sig_header = headers.get('x-razorpay-signature') or headers.get('X-Razorpay-Signature', '')

        # 2. Verify HMAC Signature
        if webhook_secret:
            expected_sig = hmac.new(
                webhook_secret.encode('utf-8'),
                body_str.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(expected_sig, sig_header):
                print("Signature verification failed")
                return {"statusCode": 400, "body": "Invalid signature"}

        # 3. Parse Event
        payload = json.loads(body_str)
        event_type = payload.get("event", "")
        print(f"📩 Razorpay webhook: {event_type}")

        # Extract data safely
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        notes = payment_entity.get("notes", {})
        user_email = notes.get("user_email")
        plan_tier = notes.get("plan_tier", "pro")

        if not order_id and not user_email:
             print("Missing order_id or user_email, ignoring")
             return {"statusCode": 200, "body": "Ignored"}

        # 4. Connect to PostgreSQL (Supabase)
        print(f"Connecting to DB for user: {user_email}")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        try:
            # 5. Handle Payment Captured
            if event_type == "payment.captured" and user_email:
                cursor.execute("SELECT id, subscription_id FROM users WHERE email = %s", (user_email,))
                user = cursor.fetchone()
                
                if user:
                    db_user_id, current_sub_id = user
                    if current_sub_id != order_id:
                        now = datetime.now(timezone.utc)
                        expires_at = now + timedelta(days=30)
                        
                        cursor.execute("""
                            UPDATE users 
                            SET subscription_id = %s, subscription_status = 'active', 
                                plan_tier = %s, billing_period_start = %s, 
                                plan_expires_at = %s, signals_used_month = 0
                            WHERE id = %s
                        """, (order_id, plan_tier, now, expires_at, db_user_id))
                        conn.commit()
                        print(f"✅ Webhook upgraded user: {user_email} to {plan_tier}")
                    else:
                        print("User already upgraded for this order_id")
                else:
                    print(f"User not found for email: {user_email}")

            # 6. Handle Refunds
            elif event_type in ("refund.created", "refund.processed", "payment.refunded") and user_email:
                cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
                user = cursor.fetchone()
                
                if user:
                    db_user_id = user[0]
                    cursor.execute("""
                        UPDATE users 
                        SET subscription_status = 'cancelled', plan_tier = 'free', 
                            plan_expires_at = NULL
                        WHERE id = %s
                    """, (db_user_id,))
                    conn.commit()
                    print(f"⚠️ Webhook downgraded user due to refund: {user_email}")

        finally:
            cursor.close()
            conn.close()

        return {"statusCode": 200, "body": json.dumps({"received": True})}

    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        # Return 200 so Razorpay doesn't keep retrying if it's our internal parsing error
        return {"statusCode": 200, "body": "Error processed"}
