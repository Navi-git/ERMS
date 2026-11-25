import pytest
from django.urls import reverse

from apps.accounts.models import AuditLog, User, UserSecurity
from apps.companies.models import Company
from apps.master_data.models import MasterDataItem, SkillAliasRelation
from shared.constants.master_data import MasterDataCategory
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_admin(email="superadmin@example.com", **extra):
    admin = User.objects.create_superuser(email, PASSWORD, full_name="Super Admin", **extra)
    UserSecurity.objects.get_or_create(user=admin)
    return admin


def make_user(email="user@example.com", role=Role.CANDIDATE, **extra):
    user = User.objects.create_user(email, PASSWORD, is_email_verified=True, role=role, full_name="Test User", **extra)
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestPublicMasterData:
    def test_public_category_list_active_items(self, api):
        MasterDataItem.objects.create(category=MasterDataCategory.INDUSTRY, key="tech", value="Technology", is_active=True)
        MasterDataItem.objects.create(category=MasterDataCategory.INDUSTRY, key="archived", value="Old Tech", is_active=False)

        res = api.get(reverse("master_data:category-items", kwargs={"category": "industry"}))
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["key"] == "tech"

    def test_public_employment_types(self, api):
        res = api.get(reverse("master_data:employment-types"))
        assert res.status_code == 200
        keys = [item["key"] for item in res.data]
        assert "full_time" in keys
        assert "contract" in keys

    def test_public_skill_search_matches_alias(self, api):
        js = MasterDataItem.objects.create(category=MasterDataCategory.SKILL, key="javascript", value="JavaScript")
        SkillAliasRelation.objects.create(alias_text="JS", target_skill=js)

        # Searching for "JS" should return "JavaScript"
        res = api.get(reverse("master_data:category-items", kwargs={"category": "skill"}), {"search": "JS"})
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["value"] == "JavaScript"

    def test_invalid_category_rejected(self, api):
        res = api.get(reverse("master_data:category-items", kwargs={"category": "non_existent"}))
        assert res.status_code == 400
        assert res.data["code"] == "invalid_category"


class TestAdminMasterDataPermissions:
    def test_anonymous_cannot_access_admin_endpoints(self, api):
        res = api.get(reverse("admin_master_data:list"))
        assert res.status_code == 401

    def test_candidate_cannot_access_admin_endpoints(self, api):
        cand = make_user()
        auth_client(api, cand)
        res = api.get(reverse("admin_master_data:list"))
        assert res.status_code == 403


class TestAdminMasterDataCRUD:
    def test_admin_can_create_and_audit(self, api):
        admin = make_admin()
        auth_client(api, admin)

        res = api.post(
            reverse("admin_master_data:list"),
            {
                "category": "work_mode",
                "key": "remote_first",
                "value": "Remote First",
                "description": "Defaults to fully remote work",
                "display_order": 1,
            },
        )
        assert res.status_code == 201
        assert res.data["key"] == "remote_first"

        # Check audit log created
        log = AuditLog.objects.filter(actor=admin, action="master_data_created").first()
        assert log is not None
        assert log.new_values.get("key") == "remote_first"

    def test_admin_cannot_create_duplicate_item(self, api):
        admin = make_admin()
        auth_client(api, admin)
        MasterDataItem.objects.create(category=MasterDataCategory.INDUSTRY, key="fintech", value="Fintech")

        res = api.post(
            reverse("admin_master_data:list"),
            {"category": "industry", "key": "fintech", "value": "Financial Technology"},
        )
        assert res.status_code == 409
        assert res.data["code"] == "duplicate_item"

    def test_admin_can_update_item(self, api):
        admin = make_admin()
        auth_client(api, admin)
        item = MasterDataItem.objects.create(category=MasterDataCategory.DEPARTMENT, key="eng", value="Engineering")

        res = api.patch(
            reverse("admin_master_data:detail", kwargs={"item_id": item.id}),
            {"value": "Engineering & Technology", "is_active": False},
        )
        assert res.status_code == 200
        item.refresh_from_db()
        assert item.value == "Engineering & Technology"
        assert item.is_active is False
        assert AuditLog.objects.filter(actor=admin, action="master_data_updated").exists()

    def test_admin_delete_unused_item(self, api):
        admin = make_admin()
        auth_client(api, admin)
        item = MasterDataItem.objects.create(category=MasterDataCategory.BENEFIT, key="snacks", value="Free Snacks")

        res = api.delete(reverse("admin_master_data:detail", kwargs={"item_id": item.id}))
        assert res.status_code == 200
        assert not MasterDataItem.objects.filter(id=item.id).exists()
        assert AuditLog.objects.filter(actor=admin, action="master_data_deleted").exists()

    def test_admin_delete_blocked_when_item_in_use(self, api):
        admin = make_admin()
        recruiter = make_user("recruiter@example.com", role=Role.RECRUITER)
        auth_client(api, admin)

        industry = MasterDataItem.objects.create(category=MasterDataCategory.INDUSTRY, key="tech", value="Technology")
        Company.objects.create(name="Innovate Corp", admin_user=recruiter, industry_id=industry.id)

        # Deleting should fail with 409 Conflict
        res = api.delete(reverse("admin_master_data:detail", kwargs={"item_id": industry.id}))
        assert res.status_code == 409
        assert res.data["code"] == "in_use"
        assert MasterDataItem.objects.filter(id=industry.id).exists()


class TestAdminReorderAndAliases:
    def test_admin_can_reorder_items(self, api):
        admin = make_admin()
        auth_client(api, admin)
        i1 = MasterDataItem.objects.create(category=MasterDataCategory.WORK_MODE, key="wm1", value="A", display_order=10)
        i2 = MasterDataItem.objects.create(category=MasterDataCategory.WORK_MODE, key="wm2", value="B", display_order=20)

        res = api.post(
            reverse("admin_master_data:reorder"),
            {
                "category": "work_mode",
                "items": [
                    {"id": i1.id, "display_order": 50},
                    {"id": i2.id, "display_order": 5},
                ],
            },
            format="json",
        )
        assert res.status_code == 200
        i1.refresh_from_db()
        i2.refresh_from_db()
        assert i1.display_order == 50
        assert i2.display_order == 5

    def test_admin_alias_lifecycle(self, api):
        admin = make_admin()
        auth_client(api, admin)
        py = MasterDataItem.objects.create(category=MasterDataCategory.SKILL, key="python", value="Python")

        # Create alias
        res = api.post(
            reverse("admin_master_data:alias-list"),
            {"alias_text": "Py", "target_skill_id": py.id, "confidence_score": 95},
        )
        assert res.status_code == 201
        alias_id = res.data["id"]

        # List aliases
        list_res = api.get(reverse("admin_master_data:alias-list"))
        assert list_res.status_code == 200
        assert any(a["alias_text"] == "Py" for a in list_res.data)

        # Delete alias
        del_res = api.delete(reverse("admin_master_data:alias-detail", kwargs={"alias_id": alias_id}))
        assert del_res.status_code == 200
        assert not SkillAliasRelation.objects.filter(id=alias_id).exists()
