"""Initial schema – Week 2-5 full schema

Revision ID: 001
Revises:
Create Date: 2026-04-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extensions (idempotent)
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "hstore"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "ltree"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "citext"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "timescaledb"')

    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("email", sa.Text, unique=True, nullable=False),
        sa.Column("username", sa.Text, unique=True, nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("full_name", sa.Text, nullable=False, server_default=""),
        sa.Column("role", sa.String(20), nullable=False, server_default="student"),
        sa.Column("ip_address", postgresql.INET, nullable=True),
        sa.Column("submitted_lat", sa.Float, nullable=True),
        sa.Column("submitted_lng", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()")),
    )

    # course_tree
    op.create_table(
        "course_tree",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("label", sa.Text, nullable=False),
        sa.Column("path", sa.Text, unique=True, nullable=False),
        sa.Column("description", sa.Text, server_default=""),
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_course_tree_path ON course_tree USING GIST (path::ltree)")

    # assignments
    op.create_table(
        "assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, server_default=""),
        sa.Column("course_path", sa.Text, nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()")),
    )

    # submissions (pgvector + hstore + PostGIS float cols)
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_text", sa.Text, nullable=False, server_default=""),
        sa.Column("language", sa.String(30), nullable=False, server_default="python"),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("feedback", sa.Text, nullable=True),
        sa.Column("similarity_score", sa.Float, nullable=True),
        sa.Column("is_flagged", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("test_results", postgresql.HSTORE, nullable=True),
        sa.Column("ip_address", postgresql.INET, nullable=True),
        sa.Column("submitted_lat", sa.Float, nullable=True),
        sa.Column("submitted_lng", sa.Float, nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True),
                  server_default=sa.text("NOW()")),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    # pgvector sütunu raw SQL ile eklenir (Alembic tipi yok)
    op.execute("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS code_embedding vector(384)")
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_submissions_embedding
        ON submissions USING hnsw (code_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # submission_metrics (TimescaleDB hypertable)
    op.create_table(
        "submission_metrics",
        sa.Column("time", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("processing_time_ms", sa.Integer, nullable=True),
        sa.Column("similarity_score", sa.Float, nullable=True),
    )
    op.execute("SELECT create_hypertable('submission_metrics', 'time', if_not_exists => TRUE)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS submission_metrics CASCADE")
    op.execute("DROP TABLE IF EXISTS submissions CASCADE")
    op.execute("DROP TABLE IF EXISTS assignments CASCADE")
    op.execute("DROP TABLE IF EXISTS course_tree CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
