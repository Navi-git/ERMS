from django.db import models


class Role(models.TextChoices):
    """Allowed values for users.role (from the ERD comment: candidate, recruiter, super_admin)."""
    CANDIDATE = "candidate", "Candidate"
    RECRUITER = "recruiter", "Recruiter"
    SUPER_ADMIN = "super_admin", "Super Admin"
