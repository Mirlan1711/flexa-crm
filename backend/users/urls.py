from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AssigneeListView, MeView, PasswordChangeView, RegisterView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = router.urls + [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("me/password/", PasswordChangeView.as_view(), name="password-change"),
    path("assignees/", AssigneeListView.as_view(), name="assignee-list"),
]

