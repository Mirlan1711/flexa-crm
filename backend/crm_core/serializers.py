from rest_framework import serializers

from .models import ActivityLog, Client, CustomField, Deal, EntityType, Status, Task


class CustomDataValidationMixin:
    entity_type = None

    def validate_custom_data(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Пользовательские данные должны быть объектом.")

        fields = CustomField.objects.filter(
            entity_type=self.entity_type, is_active=True
        )
        field_map = {field.field_key: field for field in fields}
        unknown_keys = set(value) - set(field_map)
        if unknown_keys:
            raise serializers.ValidationError(
                {key: "Поле не настроено или отключено." for key in unknown_keys}
            )

        errors = {}
        for key, field in field_map.items():
            raw_value = value.get(key)
            if field.is_required and (raw_value is None or raw_value == ""):
                errors[key] = "Поле обязательно для заполнения."
                continue
            if raw_value in (None, ""):
                continue
            if field.data_type == CustomField.DataType.NUMBER:
                try:
                    float(raw_value)
                except (TypeError, ValueError):
                    errors[key] = "Ожидается число."
            elif field.data_type == CustomField.DataType.BOOLEAN and not isinstance(raw_value, bool):
                errors[key] = "Ожидается логическое значение."
            elif field.data_type == CustomField.DataType.SELECT and raw_value not in (field.options or []):
                errors[key] = "Значение отсутствует в списке вариантов."
        if errors:
            raise serializers.ValidationError(errors)
        return value


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ("id", "name", "entity_type", "color", "sort_order", "is_final", "is_active")

    def validate_entity_type(self, value):
        if self.instance and self.instance.entity_type != value:
            raise serializers.ValidationError("Тип сущности существующего статуса нельзя изменить.")
        return value


class ClientSerializer(CustomDataValidationMixin, serializers.ModelSerializer):
    entity_type = EntityType.CLIENT
    responsible_name = serializers.CharField(source="responsible.username", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Client
        fields = (
            "id", "name", "phone", "email", "description", "responsible",
            "responsible_name", "status", "status_name", "custom_data",
            "created_at", "updated_at",
        )
        read_only_fields = ("responsible_name", "status_name", "created_at", "updated_at")
        extra_kwargs = {"status": {"required": False, "allow_null": True}}

    def validate_email(self, value):
        return value.strip().lower()

    def create(self, validated_data):
        if validated_data.get("status") is None:
            validated_data.pop("status", None)
        if not validated_data.get("status"):
            status, _ = Status.objects.get_or_create(
                name="Новый", entity_type="client", defaults={"color": "#2563eb"}
            )
            validated_data["status"] = status
        if not validated_data.get("responsible"):
            validated_data["responsible"] = self.context["request"].user
        return super().create(validated_data)


class DealSerializer(CustomDataValidationMixin, serializers.ModelSerializer):
    entity_type = EntityType.DEAL
    client_name = serializers.CharField(source="client.name", read_only=True)
    responsible_name = serializers.CharField(source="responsible.username", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Deal
        fields = (
            "id", "name", "client", "client_name", "responsible", "responsible_name",
            "status", "status_name", "amount", "description", "planned_end_date",
            "custom_data", "created_at", "updated_at",
        )
        read_only_fields = ("client_name", "responsible_name", "status_name", "created_at", "updated_at")
        extra_kwargs = {"status": {"required": False, "allow_null": True}}

    def create(self, validated_data):
        if not validated_data.get("status"):
            status, _ = Status.objects.get_or_create(
                name="Новая", entity_type="deal", defaults={"color": "#2563eb"}
            )
            validated_data["status"] = status
        if not validated_data.get("responsible"):
            validated_data["responsible"] = self.context["request"].user
        return super().create(validated_data)


class TaskSerializer(CustomDataValidationMixin, serializers.ModelSerializer):
    entity_type = EntityType.TASK
    assignee_name = serializers.CharField(source="assignee.username", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    deal_name = serializers.CharField(source="deal.name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "assignee", "assignee_name", "client", "client_name",
            "deal", "deal_name", "status", "status_name", "priority", "due_date", "custom_data",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "assignee_name", "client_name", "deal_name", "status_name", "created_at", "updated_at",
        )
        extra_kwargs = {"status": {"required": False, "allow_null": True}}

    def validate(self, attrs):
        deal = attrs.get("deal")
        client = attrs.get("client")
        if deal and client and deal.client_id != client.id:
            raise serializers.ValidationError({"client": "Клиент задачи должен совпадать с клиентом сделки."})
        if deal and not client:
            attrs["client"] = deal.client
        return attrs

    def create(self, validated_data):
        if not validated_data.get("status"):
            status, _ = Status.objects.get_or_create(
                name="Новая", entity_type=EntityType.TASK, defaults={"color": "#2563eb"}
            )
            validated_data["status"] = status
        if not validated_data.get("assignee"):
            validated_data["assignee"] = self.context["request"].user
        return super().create(validated_data)


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = (
            "id", "name", "field_key", "entity_type", "data_type", "options",
            "is_required", "is_active", "sort_order",
        )

    def validate_field_key(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        data_type = attrs.get("data_type", getattr(self.instance, "data_type", None))
        options = attrs.get("options", getattr(self.instance, "options", []))
        if data_type == CustomField.DataType.SELECT:
            if not isinstance(options, list) or not options or not all(isinstance(item, str) and item.strip() for item in options):
                raise serializers.ValidationError({"options": "Для списка укажите непустой массив строк."})
        elif options:
            raise serializers.ValidationError({"options": "Варианты можно задавать только для поля-списка."})
        return attrs


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    entity_type_name = serializers.CharField(source="get_entity_type_display", read_only=True)

    class Meta:
        model = ActivityLog
        fields = (
            "id", "username", "action", "entity_type", "entity_type_name", "entity_id",
            "description", "ip_address", "created_at",
        )

