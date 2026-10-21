from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ActivityLog, Client, CustomField, Status


class CRMApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="tester", password="StrongPass123!", role="manager"
        )
        self.client.force_authenticate(self.user)
        self.client_status, _ = Status.objects.get_or_create(name="Новый", entity_type="client")
        self.deal_status, _ = Status.objects.get_or_create(name="Новая", entity_type="deal")
        self.task_status, _ = Status.objects.get_or_create(name="Новая", entity_type="task")

    def test_client_and_deal_creation(self):
        client_response = self.client.post("/api/clients/", {"name": "ООО Тест"}, format="json")
        self.assertEqual(client_response.status_code, 201)
        deal_response = self.client.post(
            "/api/deals/",
            {"name": "Первая сделка", "client": client_response.data["id"], "amount": "1500"},
            format="json",
        )
        self.assertEqual(deal_response.status_code, 201)
        self.assertEqual(deal_response.data["client_name"], "ООО Тест")

    def test_task_filter_by_due_date(self):
        response = self.client.post(
            "/api/tasks/",
            {"title": "Позвонить клиенту", "due_date": str(timezone.localdate())},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        filtered = self.client.get("/api/tasks/?due=today")
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.data["count"], 1)
        self.assertEqual(len(filtered.data["results"]), 1)

    def test_custom_field_validation(self):
        CustomField.objects.create(
            name="Источник", field_key="source", entity_type="client", data_type="text"
        )
        response = self.client.post(
            "/api/clients/", {"name": "С полем", "custom_data": {"source": "Сайт"}}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        invalid = self.client.post(
            "/api/clients/", {"name": "С ошибкой", "custom_data": {"unknown": "x"}}, format="json"
        )
        self.assertEqual(invalid.status_code, 400)

    def test_dashboard_stats(self):
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("clients", response.data)
        self.assertIn("overdue_tasks", response.data)
        self.assertIn("sales_by_month", response.data)
        self.assertIn("manager_activity", response.data)
        self.assertIn("conversion", response.data)

    def test_activity_log_records_create_update_and_delete(self):
        created = self.client.post("/api/clients/", {"name": "Журнал"}, format="json")
        self.assertEqual(created.status_code, 201)
        client_id = created.data["id"]
        updated = self.client.patch(f"/api/clients/{client_id}/", {"phone": "+79990000000"}, format="json")
        self.assertEqual(updated.status_code, 200)
        task = self.client.post("/api/tasks/", {"title": "Удаляемая задача"}, format="json")
        self.assertEqual(task.status_code, 201)
        deleted = self.client.delete(f"/api/tasks/{task.data['id']}/")
        self.assertEqual(deleted.status_code, 204)

        logs = ActivityLog.objects.filter(user=self.user)
        self.assertEqual(logs.count(), 4)
        self.assertEqual(set(logs.values_list("action", flat=True)), {"create", "update", "delete"})
        self.assertTrue(logs.filter(entity_type="client", entity_id=client_id).exists())
        self.assertTrue(logs.filter(ip_address__isnull=False).exists())
