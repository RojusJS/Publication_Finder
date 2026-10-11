from django.core.management.base import BaseCommand, CommandError

from apps.projects.models import SavedPublication
from apps.projects.services.embedding_service import embeddings_available, ensure_embeddings


class Command(BaseCommand):
    help = "Compute missing sentence embeddings for saved publications (used by semantic search and recommendations)."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=200)

    def handle(self, *args, batch_size, **options):
        if not embeddings_available():
            raise CommandError("Embeddings are disabled or the model could not be loaded (see EMBEDDINGS_ENABLED).")
        total = 0
        while True:
            batch = list(SavedPublication.objects.filter(embedding__isnull=True).order_by("id")[:batch_size])
            if not batch:
                break
            ensure_embeddings(batch)
            done = sum(1 for publication in batch if publication.embedding)
            total += done
            self.stdout.write(f"Embedded {total} publications...")
            if done == 0:
                raise CommandError("Embedding computation failed; see the log for details.")
        self.stdout.write(self.style.SUCCESS(f"Done. {total} publications embedded."))
