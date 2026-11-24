from datetime import datetime, timezone
import uuid


def generate_ics_calendar(
    interview_id: int,
    summary: str,
    description: str,
    start_dt: datetime,
    end_dt: datetime,
    location: str = "",
    meeting_link: str = "",
    organizer_name: str = "TalentBridge Recruiting",
    organizer_email: str = "recruiting@talentbridge.io",
    attendee_name: str = "",
    attendee_email: str = "",
    status: str = "CONFIRMED",
    sequence: int = 0,
) -> str:
    """Generates an RFC 5545 compliant iCalendar (.ics) string."""

    def to_ical_dt(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        utc_dt = dt.astimezone(timezone.utc)
        return utc_dt.strftime("%Y%m%dT%H%M%SZ")

    now_utc = to_ical_dt(datetime.now(timezone.utc))
    start_str = to_ical_dt(start_dt)
    end_str = to_ical_dt(end_dt)
    uid = f"interview-{interview_id}-{uuid.uuid4().hex[:8]}@talentbridge.io"

    full_description = description or ""
    if meeting_link:
        full_description += f"\n\nMeeting Link: {meeting_link}"
    if location:
        full_description += f"\nLocation: {location}"

    # Escape iCal special characters
    def escape_text(text: str) -> str:
        return (
            text.replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
        )

    lines = [
        "BEGIN:VCALENDAR",
        "PRODID:-//TalentBridge//ERMS Interview Scheduler//EN",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now_utc}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:{escape_text(summary)}",
        f"DESCRIPTION:{escape_text(full_description)}",
        f"LOCATION:{escape_text(location or meeting_link or 'Virtual / Online')}",
        f"ORGANIZER;CN=\"{escape_text(organizer_name)}\":mailto:{organizer_email}",
    ]

    if attendee_email:
        lines.append(
            f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=\"{escape_text(attendee_name or attendee_email)}\":mailto:{attendee_email}"
        )

    lines.extend([
        f"SEQUENCE:{sequence}",
        f"STATUS:{status}",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "END:VCALENDAR",
    ])

    return "\r\n".join(lines) + "\r\n"
