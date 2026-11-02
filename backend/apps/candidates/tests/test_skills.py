import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserSecurity
from apps.candidates.models import CandidateProfile, CandidateSkill, ProficiencyLevel
from apps.master_data.models import MasterDataItem, SkillAliasRelation
from shared.constants.master_data import MasterDataCategory
from shared.constants.roles import Role

pytestmark = pytest.mark.django_db
PASSWORD = "S3cure-Pass!9"


def make_candidate(email="cand_skills@example.com"):
    user = User.objects.create_user(
        email=email,
        password=PASSWORD,
        is_email_verified=True,
        role=Role.CANDIDATE,
        full_name="Candidate Skills Test",
    )
    UserSecurity.objects.get_or_create(user=user)
    return user


def auth_client(api, user):
    refresh = RefreshToken.for_user(user)
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return refresh


class TestCandidateSkills:
    def test_add_master_data_skill(self, api):
        user = make_candidate("cand_m_skill@example.com")
        auth_client(api, user)

        py_skill = MasterDataItem.objects.create(
            category=MasterDataCategory.SKILL,
            key="python",
            value="Python",
            is_active=True,
        )

        payload = {
            "skill_id": py_skill.id,
            "proficiency_level": ProficiencyLevel.EXPERT,
            "years_of_experience": "4.5",
        }
        res = api.post("/api/v1/candidate/skills/", data=payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["skill"] == py_skill.id
        assert res.data["skill_name"] == "Python"
        assert res.data["proficiency_level"] == ProficiencyLevel.EXPERT

    def test_add_custom_skill(self, api):
        user = make_candidate("cand_custom_skill@example.com")
        auth_client(api, user)

        payload = {
            "custom_skill_name": "Proprietary Framework X",
            "proficiency_level": ProficiencyLevel.ADVANCED,
            "years_of_experience": "2.0",
        }
        res = api.post("/api/v1/candidate/skills/", data=payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["skill"] is None
        assert res.data["custom_skill_name"] == "Proprietary Framework X"
        assert res.data["skill_name"] == "Proprietary Framework X"

    def test_skill_alias_resolution(self, api):
        user = make_candidate("cand_alias@example.com")
        auth_client(api, user)

        js_skill = MasterDataItem.objects.create(
            category=MasterDataCategory.SKILL,
            key="javascript",
            value="JavaScript",
            is_active=True,
        )
        SkillAliasRelation.objects.create(
            alias_text="JS",
            target_skill=js_skill,
            confidence_score=100,
        )

        # Candidate enters "JS" as a custom skill
        payload = {
            "custom_skill_name": "JS",
            "proficiency_level": ProficiencyLevel.INTERMEDIATE,
        }
        res = api.post("/api/v1/candidate/skills/", data=payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        # Alias resolution should automatically map it to the JavaScript canonical skill!
        assert res.data["skill"] == js_skill.id
        assert res.data["skill_name"] == "JavaScript"

    def test_batch_put_and_delete_skills(self, api):
        user = make_candidate("cand_batch@example.com")
        auth_client(api, user)

        s1 = MasterDataItem.objects.create(category=MasterDataCategory.SKILL, key="react", value="React", is_active=True)
        s2 = MasterDataItem.objects.create(category=MasterDataCategory.SKILL, key="django", value="Django", is_active=True)

        batch_payload = [
            {"skill_id": s1.id, "proficiency_level": ProficiencyLevel.ADVANCED, "years_of_experience": "3.0"},
            {"skill_id": s2.id, "proficiency_level": ProficiencyLevel.EXPERT, "years_of_experience": "5.0"},
        ]
        res = api.put("/api/v1/candidate/skills/", data=batch_payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 2

        skill_to_delete_id = res.data[0]["id"]
        del_res = api.delete(f"/api/v1/candidate/skills/{skill_to_delete_id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
        assert not CandidateSkill.objects.filter(id=skill_to_delete_id).exists()
