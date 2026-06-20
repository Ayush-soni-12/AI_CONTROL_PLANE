import asyncio
from app.database.database import AsyncSessionLocal
from app.database import models
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(models.AgentPayment))
        payments = res.scalars().all()
        for p in payments:
            try:
                amt = round(int(p.amount_paid_wei) / 10**18, 6) if p.amount_paid_wei else None
            except Exception as e:
                print(f"ID {p.id}: Error converting '{p.amount_paid_wei}': {e}")

asyncio.run(run())
