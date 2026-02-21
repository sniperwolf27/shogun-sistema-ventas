"""
Migration: Add 'Recibido' state to estado_produccion enum and set as default.
Run from project root: python scripts/add_recibido_state.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2

DATABASE_URL = '[SUPABASE_URL_REMOVED]'

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Check current enum values
cur.execute("SELECT unnest(enum_range(NULL::estado_produccion))::text")
vals = [r[0] for r in cur.fetchall()]
print("Current enum values:", vals)

# 2. Add 'Recibido' before 'En Producción' if missing
if 'Recibido' not in vals:
    # PostgreSQL requires BEFORE or AFTER an existing value
    # We want: Recibido → En Producción → ...
    cur.execute("ALTER TYPE estado_produccion ADD VALUE 'Recibido' BEFORE 'En Producci\u00f3n'")
    print("✅ 'Recibido' added to estado_produccion enum")
else:
    print("ℹ️  'Recibido' already exists in enum")

# 3. Set column default to 'Recibido'
cur.execute("ALTER TABLE pedidos ALTER COLUMN estado_produccion SET DEFAULT 'Recibido'::estado_produccion")
print("✅ Default for estado_produccion set to 'Recibido'")

cur.close()
conn.close()
print("\nMigration complete. New orders will start as 'Recibido'.")
