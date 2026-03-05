import os
import time
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

POLL_INTERVAL = 5  # seconds

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def fetch_next_job(cur):
    cur.execute("""
        SELECT id
        FROM "Job"
        WHERE status = 'pending'
        ORDER BY "createTs"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    """)
    row = cur.fetchone()
    return row[0] if row else None

def process_job(job_id, conn):
    cur = conn.cursor()
    print(f"Processing job {job_id}")

    cur.execute("""
        UPDATE "Job"
        SET status = 'in_progress', "updateTs" = NOW()
        WHERE id = %s
    """, (job_id,))
    conn.commit()

    cur.execute("""
        SELECT id, "fileName", "filePath"
        FROM "Task"
        WHERE "jobId" = %s
        ORDER BY id
    """, (job_id,))
    tasks = cur.fetchall()

    for task_id, file_name, file_path in tasks:
        cur.execute("""
            UPDATE "Task"
            SET status = 'in_progress', pid = %s, "startTs" = NOW()
            WHERE id = %s
        """, (os.getpid(), task_id))
        conn.commit()

        time.sleep(2)  # simulate processing

        # output = {
        #     "summary": f"Processed content of {file_name}",
        #     "sentiment": "Neutral"
        # }

        cur.execute("""
            UPDATE "Task"
            SET status = 'pending',
                "endTs" = NOW()
            WHERE id = %s
        """, (task_id))
        conn.commit()

    cur.execute("""
        UPDATE "Job"
        SET status = 'pending', "updateTs" = NOW()
        WHERE id = %s
    """, (job_id,))
    conn.commit()
    cur.close()

def run_daemon():
    print("Job daemon started")
    conn = get_db_connection()
    conn.autocommit = False

    while True:
        try:
            cur = conn.cursor()
            job_id = fetch_next_job(cur)
            cur.close()

            if job_id:
                process_job(job_id, conn)
            else:
                time.sleep(POLL_INTERVAL)

        except Exception as e:
            print("Daemon error:", e)
            time.sleep(5)

if __name__ == "__main__":
    run_daemon()
