"""Data migration.

1. Publication labels used to be stored as Lithuanian display strings. They are
   now stable codes and translated by the frontend.
2. Root folders previously could share a name (SQL ``NULL`` parents are never
   equal, so the old unique constraint did not apply). Duplicates are renamed
   so the new ``unique_root_folder_name`` constraint can be added.
"""
from django.db import migrations

LABEL_CODES = {
    "Perskaityti": "to_read",
    "Perskaityta": "read",
    "Cituoti": "to_cite",
    "Cituota": "cited",
}


def forwards_labels(apps, schema_editor):
    SavedPublication = apps.get_model("projects", "SavedPublication")
    for old, new in LABEL_CODES.items():
        SavedPublication.objects.filter(label=old).update(label=new)
    # Any other unexpected value is dropped rather than left invalid.
    SavedPublication.objects.exclude(label__isnull=True).exclude(label__in=LABEL_CODES.values()).update(label=None)


def backwards_labels(apps, schema_editor):
    SavedPublication = apps.get_model("projects", "SavedPublication")
    for old, new in LABEL_CODES.items():
        SavedPublication.objects.filter(label=new).update(label=old)


def dedupe_root_folders(apps, schema_editor):
    Folder = apps.get_model("projects", "Folder")
    root_folders = Folder.objects.filter(parent__isnull=True).order_by("project_id", "created_at", "id")
    taken = {}
    for folder in root_folders:
        names = taken.setdefault(folder.project_id, set())
        if folder.name not in names:
            names.add(folder.name)
            continue
        counter = 2
        while True:
            suffix = f" ({counter})"
            candidate = f"{folder.name[: 255 - len(suffix)]}{suffix}"
            if candidate not in names:
                break
            counter += 1
        names.add(candidate)
        folder.name = candidate
        folder.save(update_fields=["name"])


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0012_publication_metadata_and_note_authors"),
    ]

    operations = [
        migrations.RunPython(forwards_labels, backwards_labels),
        migrations.RunPython(dedupe_root_folders, migrations.RunPython.noop),
    ]
