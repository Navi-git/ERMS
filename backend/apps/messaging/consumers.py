from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from apps.messaging.models import ConversationParticipant
from apps.messaging.services import MessagingService


@database_sync_to_async
def is_participant(user_id, conversation_id):
    return ConversationParticipant.objects.filter(
        conversation_id=conversation_id,
        user_id=user_id,
        is_active=True,
    ).exists()


@database_sync_to_async
def get_user_active_conversation_ids(user):
    return list(
        ConversationParticipant.objects.filter(
            user=user, is_active=True
        ).values_list("conversation_id", flat=True)
    )


@database_sync_to_async
def mark_read_async(user, conversation_id):
    return MessagingService.mark_conversation_read(user, conversation_id)


@database_sync_to_async
def send_message_async(user, conversation_id, content):
    return MessagingService.send_message(user, conversation_id, content=content)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")

        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        if not self.user.is_active or getattr(self.user, "suspended_at", None):
            await self.close(code=4403)
            return

        self.user_group = f"user_{self.user.id}"
        self.joined_rooms = set()

        # 1. Join personal user notification/unread channel
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # 2. Check if specific conversation_id was provided in URL kwargs
        url_conv_id = self.scope.get("url_route", {}).get("kwargs", {}).get("conversation_id")
        if url_conv_id:
            try:
                conv_id = int(url_conv_id)
                if await is_participant(self.user.id, conv_id):
                    room_name = f"chat_conversation_{conv_id}"
                    await self.channel_layer.group_add(room_name, self.channel_name)
                    self.joined_rooms.add(room_name)
            except (ValueError, TypeError):
                pass

        # 3. Automatically subscribe to all active conversations of the user so instant messages pop up
        conv_ids = await get_user_active_conversation_ids(self.user)
        for c_id in conv_ids:
            room = f"chat_conversation_{c_id}"
            await self.channel_layer.group_add(room, self.channel_name)
            self.joined_rooms.add(room)

        await self.accept()
        await self.send_json({
            "type": "connection_established",
            "user_id": self.user.id,
            "joined_rooms_count": len(self.joined_rooms),
        })

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        if hasattr(self, "joined_rooms"):
            for room in self.joined_rooms:
                await self.channel_layer.group_discard(room, self.channel_name)
            self.joined_rooms.clear()

    async def receive_json(self, content):
        action = content.get("action") or content.get("type")
        conv_id = content.get("conversation_id")

        if action == "ping":
            await self.send_json({"type": "pong"})
            return

        if action == "join_conversation":
            if not conv_id:
                return
            if await is_participant(self.user.id, conv_id):
                room = f"chat_conversation_{conv_id}"
                if room not in self.joined_rooms:
                    await self.channel_layer.group_add(room, self.channel_name)
                    self.joined_rooms.add(room)
                await self.send_json({"type": "conversation_joined", "conversation_id": conv_id})

        elif action == "leave_conversation":
            if not conv_id:
                return
            room = f"chat_conversation_{conv_id}"
            if room in self.joined_rooms:
                await self.channel_layer.group_discard(room, self.channel_name)
                self.joined_rooms.discard(room)
            await self.send_json({"type": "conversation_left", "conversation_id": conv_id})

        elif action == "typing":
            if not conv_id:
                return
            room = f"chat_conversation_{conv_id}"
            is_typing = bool(content.get("is_typing", True))
            await self.channel_layer.group_send(
                room,
                {
                    "type": "chat.typing",
                    "conversation_id": conv_id,
                    "user_id": self.user.id,
                    "full_name": self.user.full_name,
                    "is_typing": is_typing,
                }
            )

        elif action == "read":
            if not conv_id:
                return
            res = await mark_read_async(self.user, conv_id)
            await self.send_json({
                "type": "marked_read",
                "conversation_id": conv_id,
                "unread_count": res.get("unread_count", 0),
            })

        elif action == "send_message":
            if not conv_id:
                return
            msg_content = content.get("content", "").strip()
            if not msg_content:
                return
            try:
                await send_message_async(self.user, conv_id, msg_content)
            except Exception as e:
                await self.send_json({"type": "error", "message": str(e)})

    # Channel Layer Event Handlers
    async def chat_message(self, event):
        await self.send_json({
            "type": "chat.message",
            "message": event.get("message"),
        })

    async def chat_message_updated(self, event):
        await self.send_json({
            "type": "chat.message_updated",
            "message_id": event.get("message_id"),
            "conversation_id": event.get("conversation_id"),
            "content": event.get("content"),
            "is_edited": event.get("is_edited", True),
            "edited_at": event.get("edited_at"),
        })

    async def chat_message_deleted(self, event):
        await self.send_json({
            "type": "chat.message_deleted",
            "message_id": event.get("message_id"),
            "conversation_id": event.get("conversation_id"),
        })

    async def chat_typing(self, event):
        # Don't echo typing indicators back to the sender
        if event.get("user_id") == self.user.id:
            return
        await self.send_json({
            "type": "chat.typing",
            "conversation_id": event.get("conversation_id"),
            "user_id": event.get("user_id"),
            "full_name": event.get("full_name"),
            "is_typing": event.get("is_typing", True),
        })

    async def chat_read_receipt(self, event):
        await self.send_json({
            "type": "chat.read_receipt",
            "conversation_id": event.get("conversation_id"),
            "user_id": event.get("user_id"),
            "last_read_at": event.get("last_read_at"),
        })

    async def chat_unread_update(self, event):
        await self.send_json({
            "type": "chat.unread_update",
            "unread_count": event.get("unread_count"),
            "conversation_id": event.get("conversation_id"),
            "last_message": event.get("last_message"),
        })
