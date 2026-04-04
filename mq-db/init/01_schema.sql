-- Setup PGMQ on the dedicated message queue database
CREATE EXTENSION IF NOT EXISTS "pgmq";

-- Submission işleme kuyruğunu oluştur
SELECT pgmq.create('submission_queue');
