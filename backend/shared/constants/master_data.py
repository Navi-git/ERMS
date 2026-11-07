from django.db import models

class MasterDataCategory(models.TextChoices):
    INDUSTRY = "industry", "Industry"
    DEPARTMENT = "department", "Department"
    JOB_CATEGORY = "job_category", "Job Category"
    EMPLOYMENT_TYPE = "employment_type", "Employment Type"
    EXPERIENCE_LEVEL = "experience_level", "Experience Level"
    WORK_MODE = "work_mode", "Work Mode"
    SKILL = "skill", "Skill"
    TALENT_TRACK = "talent_track", "Talent Track"
    BENEFIT = "benefit", "Benefit"

class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full Time"
    PART_TIME = "part_time", "Part Time"
    CONTRACT = "contract", "Contract"
    TEMPORARY = "temporary", "Temporary"
    INTERNSHIP = "internship", "Internship"
    OTHER = "other", "Other"

EmployementType = EmploymentType
