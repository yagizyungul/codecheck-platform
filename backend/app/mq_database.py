"""
pgmq – Message Queue DB bağlantısı (psycopg2 tabanlı)
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

MQ_DATABASE_URL = os.getenv(
    "MQ_DATABASE_URL",
    "postgresql://mq_user:mq_password@mq-db:5432/mq_db",
)


def _get_mq_conn():
    return psycopg2.connect(MQ_DATABASE_URL)


def send_submission(submission_id: str) -> int:
    """
    pgmq submission_queue kuyruğuna mesaj gönderir.
    Döner: msg_id (integer)
    """
    conn = _get_mq_conn()
    try:
        with conn.cursor() as cur:
            payload = json.dumps({"submission_id": submission_id})
            cur.execute(
                "SELECT pgmq.send(%s, %s::jsonb);",
                ("submission_queue", payload),
            )
            row = cur.fetchone()
            conn.commit()
            return row[0] if row else -1
    finally:
        conn.close()


def read_one_message() -> dict | None:
    """
    submission_queue'dan 1 mesaj okur (visibility timeout: 60s).
    Döner: { msg_id, message: { submission_id } } ya da None
    """
    conn = _get_mq_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM pgmq.read(%s, %s, %s);",
                ("submission_queue", 60, 1),
            )
            row = cur.fetchone()
            conn.commit()
            if row is None:
                return None
            return {
                "msg_id": row["msg_id"],
                "message": row["message"] if isinstance(row["message"], dict)
                           else json.loads(row["message"]),
            }
    finally:
        conn.close()


def archive_message(msg_id: int) -> None:
    """İşlenen mesajı archive tablosuna taşır (silmez, iz bırakır)."""
    conn = _get_mq_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pgmq.archive(%s, %s);", ("submission_queue", msg_id))
            conn.commit()
    finally:
        conn.close()


def delete_message(msg_id: int) -> None:
    """Mesajı tamamen siler."""
    conn = _get_mq_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pgmq.delete(%s, %s);", ("submission_queue", msg_id))
            conn.commit()
    finally:
        conn.close()
