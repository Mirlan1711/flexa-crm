from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import filters, permissions, serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import ActivityLog, Client, CustomField, Deal, EntityType, Status, Task
from .serializers import ActivityLogSerializer, ClientSerializer, CustomFieldSerializer, DealSerializer, StatusSerializer, TaskSerializer

User = get_user_model()


class IsStaffRole(permissions.BasePermission):
    """Настройку полей и справочников могут менять только управляющие роли."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or request.user.role in {"admin", "supervisor"}
        )


class OwnDataPermission(permissions.BasePermission):
    """Изменять запись может руководитель или назначенный ответственный."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method == "POST" and getattr(view, "basename", "") in {"clients", "deals"}:
            return request.user.is_staff or request.user.role in {"admin", "supervisor", "manager"}
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff or request.user.role in {"admin", "supervisor"}:
            return True
        if isinstance(obj, (Client, Deal)) and request.user.role == "user":
            return False
        if isinstance(obj, Task):
            return obj.assignee_id == request.user.id
        return getattr(obj, "responsible_id", None) == request.user.id


class StandardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def log_activity(request, action, entity_type, entity_id, description):
    ActivityLog.objects.create(
        user=request.user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=request.META.get("REMOTE_ADDR"),
    )


class AuditedModelViewSet(viewsets.ModelViewSet):
    activity_entity_type = None

    def object_label(self, instance):
        return str(instance)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_activity(self.request, "create", self.activity_entity_type, instance.id, f"Создан объект «{self.object_label(instance)}».")

    def perform_update(self, serializer):
        instance = serializer.save()
        log_activity(self.request, "update", self.activity_entity_type, instance.id, f"Изменён объект «{self.object_label(instance)}».")

    def perform_destroy(self, instance):
        label = self.object_label(instance)
        entity_id = instance.id
        log_activity(self.request, "delete", self.activity_entity_type, entity_id, f"Удалён объект «{label}».")
        instance.delete()


class ClientViewSet(AuditedModelViewSet):
    serializer_class = ClientSerializer
    activity_entity_type = EntityType.CLIENT
    pagination_class = StandardPagination
    permission_classes = [OwnDataPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Client.objects.select_related("responsible", "status").all()
        search = self.request.query_params.get("search", "").strip()
        status_id = self.request.query_params.get("status")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )
        if status_id:
            queryset = queryset.filter(status_id=status_id)
        return queryset


class ClientStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Status.objects.filter(entity_type=EntityType.CLIENT, is_active=True)


class DealViewSet(AuditedModelViewSet):
    serializer_class = DealSerializer
    activity_entity_type = EntityType.DEAL
    pagination_class = StandardPagination
    permission_classes = [OwnDataPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "amount", "planned_end_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Deal.objects.select_related("client", "responsible", "status").all()
        search = self.request.query_params.get("search", "").strip()
        status_id = self.request.query_params.get("status")
        client_id = self.request.query_params.get("client")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(client__name__icontains=search))
        if status_id:
            queryset = queryset.filter(status_id=status_id)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset


class DealStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Status.objects.filter(entity_type=EntityType.DEAL, is_active=True)


class TaskViewSet(AuditedModelViewSet):
    serializer_class = TaskSerializer
    activity_entity_type = EntityType.TASK
    pagination_class = StandardPagination
    permission_classes = [OwnDataPermission]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["title", "priority", "due_date", "created_at"]
    ordering = ["due_date", "-created_at"]

    def get_queryset(self):
        queryset = Task.objects.select_related("assignee", "client", "deal", "status").all()
        search = self.request.query_params.get("search", "").strip()
        status_id = self.request.query_params.get("status")
        priority = self.request.query_params.get("priority")
        assignee_id = self.request.query_params.get("assignee")
        due = self.request.query_params.get("due")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(client__name__icontains=search)
                | Q(deal__name__icontains=search)
            )
        if status_id:
            queryset = queryset.filter(status_id=status_id)
        if priority:
            queryset = queryset.filter(priority=priority)
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)
        if due == "today":
            queryset = queryset.filter(due_date=timezone.localdate())
        elif due == "overdue":
            queryset = queryset.filter(due_date__lt=timezone.localdate()).exclude(status__is_final=True)
        return queryset


class TaskStatusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StatusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Status.objects.filter(entity_type=EntityType.TASK, is_active=True)


class StatusViewSet(viewsets.ModelViewSet):
    """Полная настройка статусов из CRM без изменения исходного кода."""

    serializer_class = StatusSerializer
    queryset = Status.objects.all()

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated()]
        return [IsStaffRole()]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except IntegrityError:
            raise serializers.ValidationError(
                {"detail": "Статус используется в данных. Отключите его вместо удаления."}
            )


class CustomFieldViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFieldSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.IsAuthenticated()]
        return [IsStaffRole()]

    def get_queryset(self):
        queryset = CustomField.objects.all()
        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        if self.request.query_params.get("active") == "true":
            queryset = queryset.filter(is_active=True)
        return queryset


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsStaffRole]
    pagination_class = StandardPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "action", "entity_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = ActivityLog.objects.select_related("user").all()
        entity_type = self.request.query_params.get("entity_type")
        action = self.request.query_params.get("action")
        search = self.request.query_params.get("search", "").strip()
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        if action:
            queryset = queryset.filter(action=action)
        if search:
            queryset = queryset.filter(description__icontains=search)
        return queryset


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    today = timezone.localdate()
    total_deals = Deal.objects.count()
    completed_deals = Deal.objects.filter(status__is_final=True).count()
    monthly_sales = Deal.objects.filter(status__is_final=True).annotate(
        month=TruncMonth("created_at")
    ).values("month").annotate(total=Sum("amount")).order_by("month")
    manager_activity = ActivityLog.objects.filter(user__isnull=False, user__role="manager").values(
        "user__username"
    ).annotate(count=Count("id")).order_by("-count", "user__username")
    return Response({
        "clients": Client.objects.count(),
        "deals": Deal.objects.count(),
        "active_deals": Deal.objects.filter(status__is_final=False).count(),
        "deal_amount": Deal.objects.filter(status__is_final=False).aggregate(total=Sum("amount"))["total"] or 0,
        "tasks_today": Task.objects.filter(due_date=today).exclude(status__is_final=True).count(),
        "overdue_tasks": Task.objects.filter(due_date__lt=today).exclude(status__is_final=True).count(),
        "tasks_by_priority": list(Task.objects.values("priority").annotate(count=Count("id")).order_by("priority")),
        "deals_by_status": list(Deal.objects.values("status__name").annotate(count=Count("id")).order_by("status__sort_order")),
        "sales_by_month": [
            {"month": item["month"].strftime("%Y-%m"), "total": float(item["total"] or 0)}
            for item in monthly_sales
        ],
        "manager_activity": [
            {"username": item["user__username"], "count": item["count"]}
            for item in manager_activity
        ],
        "conversion": {
            "total": total_deals,
            "completed": completed_deals,
            "rate": round((completed_deals / total_deals) * 100, 1) if total_deals else 0,
        },
    })

