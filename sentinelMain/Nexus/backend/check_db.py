import asyncio
from sqlalchemy import text
from app.db.session import async_engine

async def main():
    async with async_engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))

        tables = [row[0] for row in result]

        print("\n========== NEXUS DATABASE TABLES ==========")

        if not tables:
            print("NO TABLES FOUND")
        else:
            for table in tables:
                print("  ", table)

        required = [
            "suppliers",
            "purchase_orders",
            "shipments",
            "components",
            "production_orders",
            "customer_orders",
        ]

        print("\n========== REQUIRED TABLES ==========")

        for table in required:
            status = "FOUND" if table in tables else "MISSING"
            print(f"{status:8} {table}")

        print("\n======================================")

    await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
