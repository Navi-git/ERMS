"""Audit logging helper for ERMS.

Creates immutable AuditLog records in PostgreSQL.
Captures actor (user), actor_type (super_admin, recruiter, candidate, system), action,
entity_type, entity_id, old_values, new_values, details,
plus HTTP request metadata (IP address, user agent, request_id) if request is provided.
"""
from .models import AuditLog


def get_client_ip(request):
    """Extract client IP from request headers or remote address."""
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit_log(
    *,
    action: str,
    actor=None,
    actor_type: str = None,
    entity_type: str = None,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    details: dict = None,
    request=None,
):
    """Record an administrative or security audit entry.

    Args:
        action: Short snake_case action string (e.g. 'user_suspended', 'user_soft_deleted').
        actor: User instance performing the action. If omitted and request is provided, defaults to request.user.
        actor_type: Role or actor category. If omitted, defaults to actor.role or 'system'.
        entity_type: Type of object acted upon (e.g. 'user', 'company').
        entity_id: Primary key of object acted upon.
        old_values: Dict of values prior to update.
        new_values: Dict of values after update.
        details: Dict containing context (e.g. {"reason": "Terms violation"}).
        request: Optional Django/DRF Request object to extract IP and User-Agent.

    Returns:
        AuditLog: The created audit log record.
    """
    if actor is None and request and getattr(request, "user", None) and request.user.is_authenticated:
        actor = request.user

    if actor_type is None:
        if actor and getattr(actor, "role", None):
            actor_type = actor.role
        elif actor and getattr(actor, "is_authenticated", False):
            actor_type = "user"
        else:
            actor_type = "system"

    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "") if request else ""
    request_id = request.META.get("HTTP_X_REQUEST_ID", "") if request else ""

    # Truncate user_agent if needed
    if user_agent and len(user_agent) > 1000:
        user_agent = user_agent[:1000]

    return AuditLog.objects.create(
        actor=actor,
        actor_type=actor_type,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent or None,
        request_id=request_id or None,
    )

