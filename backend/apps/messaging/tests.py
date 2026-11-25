from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.messaging.models import Conversation, ConversationParticipant, Message, MessageType
from apps.messaging.services import MessagingService
from apps.jobs.models import Job, Report, ReportStatus
from apps.companies.models import Company
from apps.candidates.models import CandidateProfile, Resume
from apps.applications.models import Application
from shared.constants.roles import Role

User = get_user_model()


class MessagingServiceTests(TestCase):
    def setUp(self):
        self.recruiter_user = User.objects.create_user(
            email="recruiter@example.com",
            password="Password123!",
            role=Role.RECRUITER,
            full_name="Alice Recruiter",
            is_email_verified=True,
        )
        self.company = Company.objects.create(
            name="Acme Corp",
            admin_user=self.recruiter_user,
        )
        self.candidate_user = User.objects.create_user(
            email="candidate@example.com",
            password="Password123!",
            role=Role.CANDIDATE,
            full_name="Bob Candidate",
            is_email_verified=True,
        )
        self.candidate_profile = CandidateProfile.objects.create(
            user=self.candidate_user,
            headline="Full Stack Engineer",
        )
        self.resume = Resume.objects.create(
            candidate=self.candidate_profile,
            title="Bob Resume",
            file_name="resume.pdf",
            file_url="/media/resumes/resume.pdf",
        )
        self.job = Job.objects.create(
            company=self.company,
            created_by=self.recruiter_user,
            job_title="Senior Python Developer",
            job_description="Build cool things",
        )
        self.application = Application.objects.create(
            candidate=self.candidate_profile,
            job=self.job,
            resume=self.resume,
        )

        self.client = APIClient()

    def test_get_or_create_conversation(self):
        # Recruiter starts conversation
        conv = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )
        self.assertIsNotNone(conv)
        self.assertEqual(conv.application_id, self.application.id)
        self.assertEqual(conv.participants.count(), 2)

        # Getting it again returns existing
        conv2 = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )
        self.assertEqual(conv.id, conv2.id)

    def test_send_and_edit_message(self):
        conv = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )

        msg = MessagingService.send_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            content="Hello Bob, loved your profile!",
        )
        self.assertEqual(msg.content, "Hello Bob, loved your profile!")
        self.assertFalse(msg.is_edited)

        # Edit message
        edited = MessagingService.edit_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            message_id=msg.id,
            new_content="Hello Bob, loved your profile! When are you free for a call?",
        )
        self.assertTrue(edited.is_edited)
        self.assertIn("call", edited.content)

    def test_soft_delete_message(self):
        conv = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )
        msg = MessagingService.send_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            content="A typo message",
        )
        MessagingService.delete_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            message_id=msg.id,
        )
        msg.refresh_from_db()
        self.assertTrue(msg.is_deleted)
        self.assertEqual(msg.content, "This message was deleted.")

    def test_mark_conversation_read_and_unread_count(self):
        conv = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )
        # Recruiter sends message to candidate
        MessagingService.send_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            content="Unread message for Bob",
        )

        # Bob unread count should be 1
        bob_unread = MessagingService.get_user_unread_count(self.candidate_user)
        self.assertEqual(bob_unread, 1)

        # Bob marks conversation as read
        MessagingService.mark_conversation_read(self.candidate_user, conv.id)
        bob_unread_after = MessagingService.get_user_unread_count(self.candidate_user)
        self.assertEqual(bob_unread_after, 0)

    def test_report_message(self):
        conv = MessagingService.get_or_create_conversation(
            user=self.recruiter_user,
            application_id=self.application.id,
        )
        msg = MessagingService.send_message(
            user=self.recruiter_user,
            conversation_id=conv.id,
            content="Suspicious link",
        )
        report = MessagingService.report_chat(
            reporter=self.candidate_user,
            conversation_id=conv.id,
            message_id=msg.id,
            reason="Spam",
            description="User sent a suspicious link",
        )
        self.assertIsNotNone(report.id)
        self.assertEqual(report.target_type, "message")
        self.assertEqual(report.target_id, msg.id)
        self.assertEqual(report.status, ReportStatus.PENDING)

    def test_api_endpoints(self):
        self.client.force_authenticate(user=self.recruiter_user)

        # Create conv via API
        resp = self.client.post("/api/v1/conversations/", {"application_id": self.application.id})
        self.assertEqual(resp.status_code, 201)
        conv_id = resp.data["id"]

        # Send message via API
        msg_resp = self.client.post(f"/api/v1/conversations/{conv_id}/messages/", {"content": "Test message"})
        self.assertEqual(msg_resp.status_code, 201)

        # List conversations
        list_resp = self.client.get("/api/v1/conversations/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertGreaterEqual(len(list_resp.data["conversations"]), 1)

        # Get messages
        msgs_resp = self.client.get(f"/api/v1/conversations/{conv_id}/messages/")
        self.assertEqual(msgs_resp.status_code, 200)
        self.assertGreaterEqual(len(msgs_resp.data["messages"]), 1)
