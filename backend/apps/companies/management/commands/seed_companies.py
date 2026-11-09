"""Django management command to seed baseline companies for development and demo."""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.companies.models import (
    Company,
    CompanyBenefit,
    CompanyTalentTrack,
    CompanyVerificationStatus,
)
from apps.master_data.models import MasterDataItem

SAMPLE_COMPANIES = [
    {
        "name": "Nexus Global",
        "description": "At Nexus Global, we build the underlying infrastructure that powers the next generation of enterprise applications. Founded on the belief that complex systems should be accessible and scalable, we provide tools that help developers and businesses build faster, more secure, and highly resilient software architectures.\n\nOur mission is to democratize advanced computational capabilities. From our flagship distributed database solutions to our edge computing platforms, we are committed to pushing the boundaries of what is possible in modern software engineering.",
        "registration_number": "CRN-9021849-B",
        "tax_id": "EIN-84-9201948",
        "industry_key": "tech_software",
        "company_size": "Enterprise",
        "founded_year": 2012,
        "website_url": "https://nexusdynamics.io",
        "headquarters_address": "450 Serra Mall",
        "city": "Stanford",
        "state": "CA",
        "country": "United States",
        "postal_code": "94305",
        "verification_status": CompanyVerificationStatus.APPROVED,
        "cover_image_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
        "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
        "benefits": [
            ("Remote-First Culture", "Work from anywhere in the world, with flexible hours tailored to your lifestyle."),
            ("Comprehensive Health", "100% premium coverage for medical, dental, and vision for you and dependents."),
            ("Learning Stipend", "Annual $2,500 budget for courses, conferences, and professional development."),
            ("Unlimited PTO", "Take the time you need to recharge, with a minimum required 3 weeks off per year."),
        ],
        "tracks": ["swe", "product_design", "cloud_devops"],
    },
    {
        "name": "Apex Financial",
        "description": "Data-driven investment strategies and quantitative analytics empowering next-generation financial institutions and fintech innovators.",
        "registration_number": "CRN-3341-X",
        "tax_id": "EIN-12-8849102",
        "industry_key": "fintech",
        "company_size": "Mid-size",
        "founded_year": 2017,
        "website_url": "https://apexfinancial.com",
        "headquarters_address": "100 Wall Street",
        "city": "New York",
        "state": "NY",
        "country": "United States",
        "postal_code": "10005",
        "verification_status": CompanyVerificationStatus.APPROVED,
        "cover_image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        "logo_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=200&q=80",
        "benefits": [
            ("Competitive Equity", "Meaningful equity ownership and performance bonus pools."),
            ("401(k) Matching", "Dollar-for-dollar 401(k) retirement match up to 6%."),
            ("Wellness Program", "Gym memberships and mental wellness subscriptions covered."),
        ],
        "tracks": ["swe", "cloud_devops"],
    },
    {
        "name": "VitaHealth Systems",
        "description": "Building the next generation of patient care management and telehealth solutions for hospitals and clinics worldwide.",
        "registration_number": "CRN-1129-C",
        "tax_id": "EIN-55-9038192",
        "industry_key": "healthcare",
        "company_size": "Enterprise",
        "founded_year": 2010,
        "website_url": "https://vitahealth.org",
        "headquarters_address": "800 N Michigan Ave",
        "city": "Chicago",
        "state": "IL",
        "country": "United States",
        "postal_code": "60611",
        "verification_status": CompanyVerificationStatus.APPROVED,
        "cover_image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
        "logo_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=200&q=80",
        "benefits": [
            ("Healthcare Coverage", "Top-tier medical plans with vision, dental, and telehealth access."),
            ("Family Leave", "16 weeks paid parental leave for primary and secondary caregivers."),
        ],
        "tracks": ["swe", "product_design"],
    },
    {
        "name": "LaunchPad AI",
        "description": "Generative AI workflows designed specifically for enterprise legal, compliance, and document operations.",
        "registration_number": "CRN-8472-A",
        "tax_id": "EIN-91-4471923",
        "industry_key": "tech_software",
        "company_size": "Startup",
        "founded_year": 2022,
        "website_url": "https://launchpad.ai",
        "headquarters_address": "500 Howard Street",
        "city": "San Francisco",
        "state": "CA",
        "country": "United States",
        "postal_code": "94105",
        "verification_status": CompanyVerificationStatus.APPROVED,
        "cover_image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
        "benefits": [
            ("Cutting-Edge Hardware", "Latest M3 Max MacBooks or Linux workstations of choice."),
            ("Commuter Stipend", "Full transit subsidy or monthly parking allowance."),
        ],
        "tracks": ["swe", "cloud_devops"],
    },
]


class Command(BaseCommand):
    help = "Seed baseline companies, benefits, and talent tracks matching Figma screens."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded demo companies that have no assigned admin user.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options.get("clear"):
            deleted_count, _ = Company.objects.filter(admin_user__isnull=True).delete()
            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted_count} seeded demo company records."))
            return

        self.stdout.write("Seeding sample companies...")

        for data in SAMPLE_COMPANIES:
            industry = MasterDataItem.objects.filter(key=data["industry_key"]).first()
            company, created = Company.objects.update_or_create(
                name=data["name"],
                defaults={
                    "description": data["description"],
                    "registration_number": data["registration_number"],
                    "tax_id": data["tax_id"],
                    "industry": industry,
                    "company_size": data["company_size"],
                    "founded_year": data["founded_year"],
                    "website_url": data["website_url"],
                    "headquarters_address": data["headquarters_address"],
                    "city": data["city"],
                    "state": data["state"],
                    "country": data["country"],
                    "postal_code": data["postal_code"],
                    "verification_status": data["verification_status"],
                    "cover_image_url": data["cover_image_url"],
                    "logo_url": data["logo_url"],
                },
            )

            # Seed benefits
            for idx, (b_name, b_desc) in enumerate(data.get("benefits", [])):
                CompanyBenefit.objects.update_or_create(
                    company=company,
                    name=b_name,
                    defaults={
                        "custom_description": b_desc,
                        "display_order": idx + 1,
                        "is_active": True,
                    },
                )

            # Seed talent tracks
            for track_key in data.get("tracks", []):
                m_item = MasterDataItem.objects.filter(key=track_key).first()
                if m_item:
                    CompanyTalentTrack.objects.get_or_create(
                        company=company,
                        master_data_item=m_item,
                    )

            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action}: {company.name}")

        self.stdout.write(self.style.SUCCESS("Successfully seeded sample companies!"))

