from psycopg.errors import EventTriggerProtocolViolated
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from shared.constants.roles import Role

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")

        if not self.user or self.user.is_anonymous:
            await self.close(code=4401)
            return
        
        # 1. Personal group: user_<id>
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # 2. Audience broadcast groups
        await self.channel_layer.group_add("broadcast_all", self.channel_name)
        if self.user.role == Role.CANDIDATE:
            await self.channel_layer.group_add("broadcast_candidates", self.channel_name)
        elif self.user.role == Role.RECRUITER:
            await self.channel_layer.group_add("broadcast_recruiters", self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
            await self.channel_layer.group_discard("broadcast_all", self.channel_name)

            if getattr(self.user, "role", None) == Role.CANDIDATE:
                await self.channel_layer.group_discard("broadcast_candidates", self.channel.name)
            elif getattr(self.user, "role", None) == Role.RECRUITER:
                await self.channel_layer.group_discard("broadcast_recruiters", self.channel_name)
    
    async def notifcation_alert(self, event):
        """Pushes real-time notification alert to client socket."""

        await self.send_json({
            "type": "notification.alert",
            "data": event["data"],
            "unread_count": event.get("unread_count"),
        })
    
    async def unread_count_update(self, event):
        """Pushes badge count update to client socket."""

        await self.send_json({
            "type": "unread_count.update",
            "unread_count": event["unread_count"],
        })