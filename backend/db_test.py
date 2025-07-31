# rehab-companion/backend/db_test.py

import psycopg2
import os
import sys

# IMPORTANT: Use the EXACT same DATABASE_URL string you have in main.py
# Make sure 'Ashok@1234' is the correct password for 'rehab_user'
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://rehab_user:Ashok%401234@localhost/rehab_db")

print(f"Attempting to connect to: {DATABASE_URL}")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT version();")
    db_version = cur.fetchone()
    print(f"Database connection successful! PostgreSQL version: {db_version[0]}")
    cur.close()
    conn.close()
    print("Connection closed.")
except psycopg2.OperationalError as e:
    print(f"Database connection FAILED due to OperationalError: {e}")
    print("\nCommon causes:")
    print("1. Incorrect username/password in DATABASE_URL.")
    print("2. PostgreSQL server is not running.")
    print("3. Database 'rehab_db' does not exist.")
    print("4. Firewall blocking port 5432.")
    sys.exit(1) # Exit with an error code
except Exception as e:
    print(f"An unexpected error occurred during database connection: {e}")
    sys.exit(1) # Exit with an error code