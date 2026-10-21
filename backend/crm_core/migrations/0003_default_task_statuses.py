from django.db import migrations


def create_task_statuses(apps, schema_editor):
    Status = apps.get_model("crm_core", "Status")
    defaults = [
        ("Новая", "#2563eb", 0, False),
        ("В работе", "#f59e0b", 1, False),
        ("Выполнена", "#16a34a", 2, True),
    ]
    for name, color, sort_order, is_final in defaults:
        Status.objects.get_or_create(
            name=name,
            entity_type="task",
            defaults={"color": color, "sort_order": sort_order, "is_final": is_final},
        )


class Migration(migrations.Migration):
    dependencies = [("crm_core", "0002_initial")]
    operations = [migrations.RunPython(create_task_statuses, migrations.RunPython.noop)]
