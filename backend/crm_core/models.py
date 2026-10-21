from django.conf import settings
from django.db import models


class EntityType(models.TextChoices):
    CLIENT = "client", "Клиент"
    DEAL = "deal", "Сделка"
    TASK = "task", "Задача"


class Status(models.Model):
    name = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    color = models.CharField(max_length=20, default="#64748b")
    sort_order = models.PositiveIntegerField(default=0)
    is_final = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["entity_type", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["name", "entity_type"], name="unique_status_per_entity")
        ]

    def __str__(self):
        return f"{self.name} ({self.get_entity_type_display()})"


class Client(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    description = models.TextField(blank=True)
    responsible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="clients")
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name="clients")
    custom_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Deal(models.Model):
    name = models.CharField(max_length=200)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="deals")
    responsible = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="deals")
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name="deals")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    custom_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Низкий"
        MEDIUM = "medium", "Средний"
        HIGH = "high", "Высокий"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, null=True, blank=True, related_name="tasks")
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, null=True, blank=True, related_name="tasks")
    status = models.ForeignKey(Status, on_delete=models.PROTECT, related_name="tasks")
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    custom_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-created_at"]

    def __str__(self):
        return self.title


class CustomField(models.Model):
    class DataType(models.TextChoices):
        TEXT = "text", "Строка"
        NUMBER = "number", "Число"
        DATE = "date", "Дата"
        BOOLEAN = "boolean", "Логическое значение"
        SELECT = "select", "Список"
        TEXTAREA = "textarea", "Многострочный текст"

    name = models.CharField(max_length=100)
    field_key = models.SlugField(max_length=100)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    data_type = models.CharField(max_length=20, choices=DataType.choices)
    options = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["entity_type", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(fields=["field_key", "entity_type"], name="unique_custom_field_per_entity")
        ]

    def __str__(self):
        return f"{self.name} ({self.get_entity_type_display()})"


class ActivityLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    entity_id = models.PositiveBigIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

