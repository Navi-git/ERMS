from django.db import migrations


def seed_decline_reasons(apps, schema_editor):
    MasterDataItem = apps.get_model("master_data", "MasterDataItem")
    reasons = [
        ("accepted_other_offer", "Accepted another offer", 10),
        ("compensation_too_low", "Compensation below expectation", 20),
        ("role_mismatch", "Role or responsibilities mismatch", 30),
        ("location_commute", "Location or commute issues", 40),
        ("counter_offer_accepted", "Accepted counter-offer from current employer", 50),
        ("personal_reasons", "Personal or family circumstances", 60),
        ("other", "Other reason", 70),
    ]
    for key, value, order in reasons:
        MasterDataItem.objects.get_or_create(
            category="decline_reason",
            key=key,
            defaults={
                "value": value,
                "display_order": order,
                "is_active": True,
            },
        )


def unseed_decline_reasons(apps, schema_editor):
    MasterDataItem = apps.get_model("master_data", "MasterDataItem")
    MasterDataItem.objects.filter(category="decline_reason").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("offers", "0001_initial"),
        ("master_data", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_decline_reasons, unseed_decline_reasons),
    ]
