"""No-op ChromaDB telemetry client to avoid PostHog capture() errors."""
from chromadb.config import System
from chromadb.telemetry.product import ProductTelemetryClient, ProductTelemetryEvent


class NoopTelemetry(ProductTelemetryClient):
    """Telemetry client that does nothing. Used to avoid PostHog API errors."""

    def capture(self, event: ProductTelemetryEvent) -> None:
        pass
