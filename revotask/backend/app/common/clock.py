from datetime import UTC, datetime


def utcnow() -> datetime:
    """Timezone-aware current time in UTC. All timestamps in RevoTask are UTC (DB-02)."""
    return datetime.now(UTC)


def same_as_created(context) -> datetime:
    """Insert default for updated_at: the row's own created_at, so an unmodified row has equal timestamps."""
    return context.get_current_parameters()["created_at"]
