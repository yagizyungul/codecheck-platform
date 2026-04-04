"""
Assignments endpoint testleri
GET /assignments
GET /assignments/{id}
"""
import pytest


class TestListAssignments:
    def test_list_requires_auth(self, client):
        resp = client.get("/assignments")
        assert resp.status_code == 403

    def test_list_success(self, client, student_token, sample_assignment):
        resp = client.get("/assignments", headers={"Authorization": f"Bearer {student_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "assignments" in data
        assert "total" in data
        assert isinstance(data["assignments"], list)
        assert data["total"] >= 1

    def test_list_contains_sample(self, client, student_token, sample_assignment):
        resp = client.get("/assignments", headers={"Authorization": f"Bearer {student_token}"})
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()["assignments"]]
        assert sample_assignment["id"] in ids

    def test_list_teacher_token(self, client, teacher_token, sample_assignment):
        resp = client.get("/assignments", headers={"Authorization": f"Bearer {teacher_token}"})
        assert resp.status_code == 200


class TestGetAssignment:
    def test_get_success(self, client, student_token, sample_assignment):
        resp = client.get(
            f"/assignments/{sample_assignment['id']}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == sample_assignment["id"]
        assert data["title"] == sample_assignment["title"]

    def test_get_not_found(self, client, student_token):
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = client.get(
            f"/assignments/{fake_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 404

    def test_get_requires_auth(self, client, sample_assignment):
        resp = client.get(f"/assignments/{sample_assignment['id']}")
        assert resp.status_code == 403
