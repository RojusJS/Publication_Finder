from rest_framework.throttling import ScopedRateThrottle


class ScopedThrottle(ScopedRateThrottle):
    """Scoped rate limiting that can be restricted to specific HTTP methods.

    Views opt in with ``throttle_scope = "<scope>"``. Setting
    ``throttle_scope_methods = ("POST",)`` limits only those methods, so cheap
    reads of the same endpoint stay unthrottled (beyond the global limits).
    """

    def allow_request(self, request, view):
        methods = getattr(view, "throttle_scope_methods", None)
        if methods and request.method not in methods:
            return True
        return super().allow_request(request, view)
