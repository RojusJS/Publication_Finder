from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0013_label_codes_and_unique_root_folders"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="folder",
            constraint=models.UniqueConstraint(
                condition=models.Q(("parent__isnull", True)),
                fields=("project", "name"),
                name="unique_root_folder_name",
            ),
        ),
    ]
