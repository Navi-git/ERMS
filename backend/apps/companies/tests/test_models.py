import pytest
from django.db import connection

from apps.companies.models import Company


@pytest.mark.django_db
def test_companies_columns_match_erd():
    with connection.cursor() as cursor:
        cols = {c.name for c in connection.introspection.get_table_description(cursor, "companies")}
    assert cols == {
        "id", "name", "description", "registration_number", "tax_id", "industry_id", "email",
        "phone", "company_size", "founded_year", "logo_url", "cover_image_url", "website_url",
        "headquarters_address", "city", "state", "country", "postal_code", "media",
        "billing_name", "billing_email", "billing_address", "admin_user_id",
        "verification_status", "suspended_at", "suspended_by", "created_at", "updated_at",
    }


@pytest.mark.django_db
def test_company_can_be_created_with_name_only():
    c = Company.objects.create(name="Acme")
    assert c.industry is None and c.verification_status == "PENDING"
