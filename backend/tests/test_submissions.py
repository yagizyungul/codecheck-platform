"""
Submissions endpoint testleri
POST /submissions
GET  /submissions/{id}
GET  /submissions/my
"""
import pytest
from unittest.mock import patch


class TestSubmitCode:
    def test_submit_requires_auth(self, client, sample_assignment):
        resp = client.post("/submissions", json={
            "assignment_id": sample_assignment["id"],
            "code_text": "print('hello')",
        })
        assert resp.status_code == 403

    @patch("app.mq_database.send_submission", return_value=1)
    def test_submit_success(self, mock_send, client, student_token, sample_assignment):
        resp = client.post(
            "/submissions",
            json={
                "assignment_id": sample_assignment["id"],
                "code_text": "def add(a, b):\n    return a + b",
                "language": "python",
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 202
        data = resp.json()
        assert "id" in data
        assert data["status"] == "pending"
        assert data["score"] is None
        assert data["language"] == "python"
        # pgmq send çağrıldı mı?
        mock_send.assert_called_once()

    @patch("app.mq_database.send_submission", return_value=1)
    def test_submit_invalid_assignment(self, mock_send, client, student_token):
        resp = client.post(
            "/submissions",
            json={
                "assignment_id": "00000000-0000-0000-0000-000000000000",
                "code_text": "print('test')",
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 404

    @patch("app.mq_database.send_submission", side_effect=Exception("pgmq down"))
    def test_submit_mq_failure_still_creates_submission(self, mock_send, client, student_token, sample_assignment):
        """pgmq çökmesi durumunda bile submission DB'ye yazılmalı."""
        resp = client.post(
            "/submissions",
            json={
                "assignment_id": sample_assignment["id"],
                "code_text": "x = 1",
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 202
        assert resp.json()["status"] == "pending"


class TestGetSubmission:
    @patch("app.mq_database.send_submission", return_value=1)
    def test_get_own_submission(self, mock_send, client, student_token, sample_assignment):
        # Önce gönder
        post_resp = client.post(
            "/submissions",
            json={"assignment_id": sample_assignment["id"], "code_text": "pass"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert post_resp.status_code == 202
        sub_id = post_resp.json()["id"]

        # Sonra getir
        get_resp = client.get(
            f"/submissions/{sub_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == sub_id

    def test_get_not_found(self, client, student_token):
        resp = client.get(
            "/submissions/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 404

    @patch("app.mq_database.send_submission", return_value=1)
    def test_other_student_cannot_access(self, mock_send, client, student_token, sample_assignment, db):
        """Başka öğrenci submission'a erişememeli."""
        from sqlalchemy import text
        import uuid

        # İkinci öğrenci oluştur
        other_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO users (id, email, username, password_hash, full_name, role)
            VALUES (:id, 'other@test.com', 'other1', 'hash', 'Other', 'student')
        """), {"id": other_id})
        db.commit()

        # İkinci öğrenci login
        client.post("/auth/register", json={
            "email": "other2@test.com", "username": "other2",
            "password": "pass123",
        })
        login_resp = client.post("/auth/login", json={
            "email": "other2@test.com", "password": "pass123",
        })
        if login_resp.status_code != 200:
            pytest.skip("İkinci kullanıcı oluşturulamadı")

        other_token = login_resp.json()["access_token"]

        # İlk öğrenci submission oluştur
        post = client.post(
            "/submissions",
            json={"assignment_id": sample_assignment["id"], "code_text": "pass"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        sub_id = post.json()["id"]

        # İkinci öğrenci erişmeye çalışsın
        resp = client.get(
            f"/submissions/{sub_id}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert resp.status_code == 403


class TestMySubmissions:
    @patch("app.mq_database.send_submission", return_value=1)
    def test_my_submissions(self, mock_send, client, student_token, sample_assignment):
        # Submission gönder
        client.post(
            "/submissions",
            json={"assignment_id": sample_assignment["id"], "code_text": "print(1)"},
            headers={"Authorization": f"Bearer {student_token}"},
        )

        resp = client.get("/submissions/my", headers={"Authorization": f"Bearer {student_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "submissions" in data
        assert data["total"] >= 1

    def test_my_submissions_requires_auth(self, client):
        resp = client.get("/submissions/my")
        assert resp.status_code == 403
