"""
pgmq Consumer – submission_queue'yu dinler ve işler.
Docker Compose'da ayrı 'worker' servisi olarak çalışır.

Akış:
  pgmq.read() → process_submission() → pgmq.archive()
"""
import time
import os
import sys

# PYTHONPATH=/app olarak ayarlandığı için
sys.path.insert(0, "/app")

from app.mq_database import read_one_message, archive_message, delete_message
from worker.pipeline import process_submission

POLL_INTERVAL = int(os.getenv("WORKER_POLL_INTERVAL", "5"))  # saniye


def run():
    print("  CodeCheck Worker başlatıldı")
    print(f"   Poll aralığı: {POLL_INTERVAL}s")
    print("   Kuyruk: submission_queue")
    print("─" * 40)

    consecutive_errors = 0

    while True:
        try:
            msg = read_one_message()

            if msg is None:
                # Kuyruk boş, bekle
                time.sleep(POLL_INTERVAL)
                consecutive_errors = 0
                continue

            msg_id = msg["msg_id"]
            submission_id = msg["message"].get("submission_id")

            if not submission_id:
                print(f"⚠️ Geçersiz mesaj (submission_id yok): {msg}")
                archive_message(msg_id)
                continue

            print(f"\n📨 Mesaj alındı: msg_id={msg_id} | submission_id={submission_id}")

            try:
                process_submission(submission_id)
                archive_message(msg_id)
                print(f"📦 Mesaj arşivlendi: msg_id={msg_id}")
            except Exception as e:
                print(f"❌ Submission işleme hatası: {e}")
                # Mesajı arşivle (retry mantığı için visibility timeout yeterli)
                archive_message(msg_id)

            consecutive_errors = 0

        except KeyboardInterrupt:
            print("\n👋 Worker durduruldu")
            break
        except Exception as e:
            consecutive_errors += 1
            print(f"❌ Worker hatası (#{consecutive_errors}): {e}")
            # Exponential backoff: 5s, 10s, 20s, max 60s
            wait = min(POLL_INTERVAL * (2 ** min(consecutive_errors - 1, 3)), 60)
            print(f"   {wait}s sonra tekrar denenecek...")
            time.sleep(wait)


if __name__ == "__main__":
    run()
