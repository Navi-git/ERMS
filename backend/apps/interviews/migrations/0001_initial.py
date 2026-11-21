import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('applications', '0001_initial'),
        ('jobs', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Interview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('interview_type', models.CharField(choices=[('phone', 'Phone Screen'), ('technical', 'Technical Interview'), ('behavioral', 'Behavioral Interview'), ('portfolio', 'Portfolio Review'), ('final', 'Final Round'), ('on_site', 'On-Site Visit'), ('hr', 'HR Screening')], default='technical', max_length=50)),
                ('scheduled_at', models.DateTimeField()),
                ('duration_minutes', models.PositiveIntegerField(default=60)),
                ('meeting_link', models.CharField(blank=True, max_length=500, null=True)),
                ('location', models.CharField(blank=True, max_length=255, null=True)),
                ('interview_status', models.CharField(choices=[('scheduled', 'Scheduled'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No-Show')], default='scheduled', max_length=20)),
                ('invitation_note', models.TextField(blank=True, null=True)),
                ('cancellation_reason', models.TextField(blank=True, null=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('feedback_submitted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to='applications.application')),
                ('cancelled_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cancelled_interviews', to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interviews', to='jobs.job')),
                ('job_stage', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='interviews', to='jobs.jobstage')),
                ('scheduled_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='scheduled_interviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'interviews',
                'ordering': ['-scheduled_at'],
            },
        ),
        migrations.CreateModel(
            name='InterviewParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('participant_type', models.CharField(choices=[('interviewer', 'Interviewer'), ('candidate', 'Candidate')], default='interviewer', max_length=20)),
                ('external_name', models.CharField(blank=True, max_length=150, null=True)),
                ('external_email', models.EmailField(blank=True, max_length=255, null=True)),
                ('participant_role', models.CharField(choices=[('lead', 'Lead Interviewer'), ('panelist', 'Panelist'), ('observer', 'Observer'), ('candidate', 'Candidate')], default='panelist', max_length=30)),
                ('invitation_sent_at', models.DateTimeField(blank=True, null=True)),
                ('response_status', models.CharField(choices=[('invited', 'Invited'), ('accepted', 'Accepted'), ('declined', 'Declined')], default='invited', max_length=30)),
                ('joined_at', models.DateTimeField(blank=True, null=True)),
                ('last_nudged_at', models.DateTimeField(blank=True, null=True)),
                ('nudge_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('interview', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='interviews.interview')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='interview_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'interview_participants',
            },
        ),
        migrations.CreateModel(
            name='InterviewFeedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(blank=True, null=True)),
                ('technical_score', models.IntegerField(blank=True, null=True)),
                ('communication_score', models.IntegerField(blank=True, null=True)),
                ('overall_score', models.FloatField(blank=True, null=True)),
                ('recommendation', models.CharField(choices=[('strong_yes', 'Strong Yes'), ('yes', 'Yes'), ('neutral', 'Neutral'), ('no', 'No'), ('strong_no', 'Strong No')], default='yes', max_length=30)),
                ('comments', models.TextField(blank=True, null=True)),
                ('growth_areas', models.TextField(blank=True, null=True)),
                ('internal_notes', models.TextField(blank=True, null=True)),
                ('submitted_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('interview', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedbacks', to='interviews.interview')),
                ('on_behalf_of_participant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedbacks_on_behalf', to='interviews.interviewparticipant')),
                ('submitted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submitted_feedbacks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'interview_feedback',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.CreateModel(
            name='InterviewFeedbackCriteria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criterion_key', models.CharField(max_length=60)),
                ('criterion_label', models.CharField(max_length=150)),
                ('criterion_description', models.TextField(blank=True, null=True)),
                ('benchmark_level', models.CharField(blank=True, max_length=50, null=True)),
                ('score', models.PositiveIntegerField()),
                ('max_score', models.PositiveIntegerField(default=5)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('feedback', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='criteria_ratings', to='interviews.interviewfeedback')),
            ],
            options={
                'db_table': 'interview_feedback_criteria',
                'ordering': ['display_order', 'id'],
            },
        ),
        migrations.AddIndex(
            model_name='interview',
            index=models.Index(fields=['job', 'scheduled_at'], name='interviews_job_id_27f10b_idx'),
        ),
        migrations.AddIndex(
            model_name='interview',
            index=models.Index(fields=['application', 'interview_status'], name='interviews_applica_6b346d_idx'),
        ),
        migrations.AddIndex(
            model_name='interviewparticipant',
            index=models.Index(fields=['interview', 'participant_type'], name='interview_p_intervi_7d9e79_idx'),
        ),
        migrations.AddConstraint(
            model_name='interviewfeedbackcriteria',
            constraint=models.UniqueConstraint(fields=('feedback', 'criterion_key'), name='unique_criterion_per_feedback'),
        ),
    ]
