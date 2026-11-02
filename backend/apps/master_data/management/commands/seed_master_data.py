"""Django management command to seed baseline master data items and skill aliases."""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.master_data.models import MasterDataItem, SkillAliasRelation
from apps.master_data.services import invalidate_master_data_cache
from shared.constants.master_data import MasterDataCategory

DATA = {
    MasterDataCategory.WORK_MODE: [
        ("remote", "Remote", "Work from anywhere"),
        ("hybrid", "Hybrid", "Mix of home and office"),
        ("on_site", "On-site", "Work at the company office"),
    ],
    MasterDataCategory.EXPERIENCE_LEVEL: [
        ("entry_level", "Entry Level", "0-2 years of experience"),
        ("mid_level", "Mid Level", "2-5 years of experience"),
        ("senior_level", "Senior Level", "5-8 years of experience"),
        ("lead_principal", "Lead / Principal", "8+ years of technical leadership"),
        ("executive", "Executive / VP", "Executive and director level"),
    ],
    MasterDataCategory.DEPARTMENT: [
        ("engineering", "Engineering", "Software, DevOps, and Systems Engineering"),
        ("product", "Product Management", "Product Strategy and Execution"),
        ("design", "Design & UX", "UI/UX, Product, and Graphic Design"),
        ("data_analytics", "Data & Analytics", "Data Science, ML, and Business Intelligence"),
        ("marketing", "Marketing", "Brand, Growth, and Content Marketing"),
        ("sales", "Sales & Business Development", "Direct Sales and Account Management"),
        ("human_resources", "Human Resources", "People Operations, Talent Acquisition"),
        ("finance", "Finance & Accounting", "Financial Planning and Bookkeeping"),
        ("operations", "Operations", "Business and IT Operations"),
    ],
    MasterDataCategory.INDUSTRY: [
        ("tech_software", "Software & Technology", "SaaS, Cloud, Artificial Intelligence"),
        ("fintech", "Financial Services & Fintech", "Banking, Payments, and Investments"),
        ("healthcare", "Healthcare & Life Sciences", "HealthTech, Biotech, and Care delivery"),
        ("ecommerce", "E-Commerce & Retail", "Online retail and marketplaces"),
        ("education", "Education & EdTech", "E-learning, universities, training"),
        ("telecom", "Telecommunications", "Mobile, Broadband, and Telecom Infrastructure"),
        ("media_entertainment", "Media & Entertainment", "Gaming, Streaming, Publishing"),
    ],
    MasterDataCategory.TALENT_TRACK: [
        ("swe", "Software Engineering", "Full-stack, frontend, and backend engineering"),
        ("product_design", "Product Design", "End-to-end digital experience and visual design"),
        ("cloud_devops", "Cloud & DevOps", "Cloud architecture, SRE, and infrastructure"),
        ("data_ai", "Data Science & AI", "Machine learning, NLP, data pipelines"),
        ("cybersecurity", "Cybersecurity", "InfoSec, penetration testing, compliance"),
    ],
    MasterDataCategory.BENEFIT: [
        ("health_insurance", "Comprehensive Health Insurance", "Medical, dental, and vision coverage"),
        ("remote_stipend", "Home Office / Remote Stipend", "Allowance for remote work equipment"),
        ("retirement_401k", "401(k) / Retirement Matching", "Retirement savings matching plan"),
        ("flexible_hours", "Flexible Working Hours", "Work whenever you are most productive"),
        ("paid_time_off", "Unlimited / Generous PTO", "Paid vacation, sick leaves, and personal days"),
        ("learning_stipend", "Learning & Development Budget", "Annual budget for courses and conferences"),
        ("parental_leave", "Paid Parental Leave", "Maternity and paternity paid leave"),
    ],
    MasterDataCategory.JOB_CATEGORY: [
        ("frontend_dev", "Frontend Development", "Web and client-side applications"),
        ("backend_dev", "Backend Development", "APIs, microservices, and databases"),
        ("fullstack_dev", "Full Stack Development", "End-to-end web architecture"),
        ("mobile_dev", "Mobile Development", "iOS, Android, React Native, Flutter"),
        ("devops_cloud", "DevOps & Cloud Engineering", "CI/CD, Kubernetes, Docker, AWS/GCP"),
        ("ui_ux_design", "UI/UX Design", "Wireframing, prototyping, user research"),
        ("qa_testing", "QA & Automation Testing", "Test suites, Selenium, Cypress, Playwright"),
    ],
    MasterDataCategory.SKILL: [
        ("python", "Python", "General-purpose programming language"),
        ("javascript", "JavaScript", "Core web scripting language"),
        ("typescript", "TypeScript", "Typed superset of JavaScript"),
        ("react", "React", "Frontend JavaScript library by Meta"),
        ("django", "Django", "High-level Python web framework"),
        ("nodejs", "Node.js", "Server-side JavaScript runtime"),
        ("postgresql", "PostgreSQL", "Open-source relational database"),
        ("docker", "Docker", "Containerization platform"),
        ("kubernetes", "Kubernetes", "Container orchestration system"),
        ("aws", "Amazon Web Services (AWS)", "Cloud computing platform"),
        ("git", "Git", "Distributed version control system"),
        ("rest_api", "RESTful APIs", "HTTP API architecture design"),
        ("graphql", "GraphQL", "Query language for APIs"),
        ("tailwind_css", "Tailwind CSS", "Utility-first CSS framework"),
        ("vuejs", "Vue.js", "Progressive frontend framework"),
        ("angular", "Angular", "TypeScript-based web application framework"),
        ("golang", "Go (Golang)", "Statically typed compiled programming language"),
        ("java", "Java", "Object-oriented programming language"),
        ("csharp", "C#", "Modern, object-oriented language by Microsoft"),
        ("redis", "Redis", "In-memory data structure store & cache"),
        ("mongodb", "MongoDB", "NoSQL document database"),
        ("nextjs", "Next.js", "React production framework by Vercel"),
        ("flutter", "Flutter", "Cross-platform mobile UI toolkit by Google"),
        ("swift", "Swift", "Apple programming language for iOS/macOS"),
        ("kotlin", "Kotlin", "Modern programming language for Android"),
        ("linux", "Linux", "Open source operating system"),
        ("ci_cd", "CI/CD Pipelines", "Continuous integration and deployment"),
        ("terraform", "Terraform", "Infrastructure as Code tool by HashiCorp"),
        ("figma", "Figma", "Collaborative interface design tool"),
    ],
}

ALIASES = [
    ("JS", "javascript"),
    ("TS", "typescript"),
    ("Py", "python"),
    ("ReactJS", "react"),
    ("Node", "nodejs"),
    ("Postgres", "postgresql"),
    ("K8s", "kubernetes"),
    ("Golang", "golang"),
    ("Next", "nextjs"),
    ("Tailwind", "tailwind_css"),
]


class Command(BaseCommand):
    help = "Seed baseline master data items and skill aliases"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding baseline Master Data..."))

        created_items = 0
        updated_items = 0

        for cat, items in DATA.items():
            for idx, (key, value, desc) in enumerate(items):
                obj, created = MasterDataItem.objects.get_or_create(
                    category=cat,
                    key=key,
                    defaults={
                        "value": value,
                        "description": desc,
                        "display_order": idx * 10,
                        "is_active": True,
                    },
                )
                if created:
                    created_items += 1
                else:
                    obj.value = value
                    obj.description = desc
                    obj.display_order = idx * 10
                    obj.save()
                    updated_items += 1

        self.stdout.write(
            self.style.SUCCESS(f"Master Data items: {created_items} created, {updated_items} updated.")
        )

        # Seed skill aliases
        alias_count = 0
        for alias_text, skill_key in ALIASES:
            target_skill = MasterDataItem.objects.filter(
                category=MasterDataCategory.SKILL, key=skill_key
            ).first()
            if target_skill:
                alias_obj, created = SkillAliasRelation.objects.get_or_create(
                    alias_text=alias_text,
                    target_skill=target_skill,
                    defaults={"confidence_score": 100},
                )
                if created:
                    alias_count += 1

        self.stdout.write(self.style.SUCCESS(f"Skill aliases seeded: {alias_count} new aliases."))
        invalidate_master_data_cache()
        self.stdout.write(self.style.SUCCESS("All Master Data caches cleared. Seeding completed successfully!"))

