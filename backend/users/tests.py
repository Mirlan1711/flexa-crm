from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class UserProfileApiTests(APITestCase):
    def test_registration_creates_regular_user(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "new_user",
                "email": "NEW@EXAMPLE.COM",
                "first_name": "Новый",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(username="new_user")
        self.assertEqual(user.email, "new@example.com")
        self.assertEqual(user.role, "user")
        self.assertTrue(user.check_password("StrongPass123!"))

    def test_profile_update_and_password_change(self):
        user = get_user_model().objects.create_user(
            username="profile_user", password="OldStrong123!", role="user"
        )
        self.client.force_authenticate(user)
        profile = self.client.patch(
            "/api/auth/me/", {"first_name": "Иван", "phone": "+79990000000"}, format="json"
        )
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.data["first_name"], "Иван")

        password = self.client.post(
            "/api/auth/me/password/",
            {
                "current_password": "OldStrong123!",
                "new_password": "NewStrong123!",
                "new_password_confirm": "NewStrong123!",
            },
            format="json",
        )
        self.assertEqual(password.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewStrong123!"))

    def test_unauthenticated_profile_is_forbidden(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_admin_can_change_role_and_regular_user_cannot(self):
        regular = get_user_model().objects.create_user(
            username="regular", password="StrongPass123!", role="user"
        )
        admin = get_user_model().objects.create_user(
            username="admin", password="StrongPass123!", role="admin", is_staff=True
        )

        self.client.force_authenticate(regular)
        forbidden = self.client.get("/api/auth/users/")
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_authenticate(admin)
        updated = self.client.patch("/api/auth/users/{}/".format(regular.id), {"role": "manager"}, format="json")
        self.assertEqual(updated.status_code, 200)
        regular.refresh_from_db()
        self.assertEqual(regular.role, "manager")
