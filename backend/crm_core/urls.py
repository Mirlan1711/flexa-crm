from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import (
    ActivityLogViewSet,
    ClientStatusViewSet,
    ClientViewSet,
    CustomFieldViewSet,
    DealStatusViewSet,
    DealViewSet,
    TaskStatusViewSet,
    StatusViewSet,
    TaskViewSet,
    dashboard_stats,
)

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="clients")
router.register("client-statuses", ClientStatusViewSet, basename="client-statuses")
router.register("deals", DealViewSet, basename="deals")
router.register("deal-statuses", DealStatusViewSet, basename="deal-statuses")
router.register("tasks", TaskViewSet, basename="tasks")
router.register("task-statuses", TaskStatusViewSet, basename="task-statuses")
router.register("statuses", StatusViewSet, basename="statuses")
router.register("custom-fields", CustomFieldViewSet, basename="custom-fields")
router.register("activity-log", ActivityLogViewSet, basename="activity-log")

urlpatterns = router.urls + [path("dashboard/stats/", dashboard_stats, name="dashboard-stats")]

