import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "config.settings.dev"))
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from apps.notifications.middleware import JwtAuthMiddleware
import apps.notifications.routing
import apps.messaging.routing

combined_websocket_urlpatterns = (
    apps.notifications.routing.websocket_urlpatterns
    + apps.messaging.routing.websocket_urlpatterns
)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(combined_websocket_urlpatterns)
    ),
})