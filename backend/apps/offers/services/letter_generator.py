import os
import re
from datetime import date
from io import BytesIO
from uuid import uuid4
from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

DEFAULT_OFFER_TEMPLATE = """Dear {candidate_name},

On behalf of {company_name}, I am thrilled to extend an offer for the position of {job_title} reporting to {hiring_manager}. We were immensely impressed by your expertise, system depth, and interview performance.

1. Compensation: Annual base salary of {salary}, payable {pay_frequency} according to the firm's regular payroll schedule.
2. Equity & Incentives: Subject to board approval, you will be granted {equity} and eligible for {bonus}.
3. Start Date & Working Arrangement: Your anticipated start date is {start_date}. This role is {work_arrangement}.

This formal offer will remain open until {expiration_date}. Please review the attached terms and submit your official response in the candidate portal. We look forward to building the future together!"""

ALLOWED_MERGE_TOKENS = {
    "candidate_name",
    "company_name",
    "job_title",
    "salary",
    "currency",
    "pay_frequency",
    "start_date",
    "expiration_date",
    "hiring_manager",
    "equity",
    "bonus",
    "sign_on_bonus",
    "work_arrangement",
}


def build_template_context(offer) -> dict:
    app = offer.application
    candidate_user = app.candidate.user
    job = app.job
    company = job.company

    curr = offer.currency or "USD"
    salary_formatted = f"${offer.salary:,} {curr}" if offer.salary else "N/A"

    equity_parts = []
    if offer.equity_units:
        equity_parts.append(f"{offer.equity_units:,} {offer.equity_type or 'Units'}")
    if offer.equity_vesting_schedule:
        equity_parts.append(f"({offer.equity_vesting_schedule})")
    equity_str = " ".join(equity_parts) if equity_parts else "N/A"

    bonus_parts = []
    if offer.bonus_target_percent:
        bonus_parts.append(f"{offer.bonus_target_percent}% target bonus")
    elif offer.bonus_target_amount:
        bonus_parts.append(f"${offer.bonus_target_amount:,} {curr} target bonus")
    bonus_str = ", ".join(bonus_parts) if bonus_parts else "Standard company incentive"

    sign_on_str = f"${offer.sign_on_bonus:,} {curr}" if offer.sign_on_bonus else "None"

    manager_display = (
        offer.reporting_manager_name
        or (offer.reports_to_user.full_name if offer.reports_to_user else "Hiring Manager")
    )
    if offer.reporting_manager_title:
        manager_display += f", {offer.reporting_manager_title}"

    def _fmt_date(val, default="N/A"):
        if not val:
            return default
        if hasattr(val, "strftime"):
            return val.strftime("%B %d, %Y")
        if isinstance(val, str):
            try:
                from datetime import date as d_cls
                return d_cls.fromisoformat(val[:10]).strftime("%B %d, %Y")
            except Exception:
                return val
        return str(val)

    start_date_str = _fmt_date(offer.start_date, "To be determined")
    exp_date_str = _fmt_date(offer.expiration_date, "N/A")

    return {
        "candidate_name": candidate_user.full_name or candidate_user.email,
        "company_name": company.name,
        "job_title": getattr(job, "job_title", getattr(job, "title", "Role")),
        "salary": salary_formatted,
        "currency": curr,
        "pay_frequency": offer.get_pay_frequency_display(),
        "start_date": start_date_str,
        "expiration_date": exp_date_str,
        "hiring_manager": manager_display,
        "equity": equity_str,
        "bonus": bonus_str,
        "sign_on_bonus": sign_on_str,
        "work_arrangement": offer.get_work_arrangement_display(),
    }


def render_template_text(template_text: str, context: dict) -> str:
    if not template_text:
        template_text = DEFAULT_OFFER_TEMPLATE

    def _replace(match):
        token = match.group(1).strip()
        return str(context.get(token, f"{{{token}}}"))

    return re.sub(r"\{([a-zA-Z0-9_]+)\}", _replace, template_text)


def generate_offer_pdf(offer) -> str:
    """Generates a professional corporate offer letter PDF using ReportLab and stores in MEDIA_ROOT."""
    context = build_template_context(offer)
    letter_body = offer.letter_content or render_template_text(
        offer.template.body_template if offer.template else DEFAULT_OFFER_TEMPLATE, context
    )

    offers_dir = os.path.join(settings.MEDIA_ROOT, "offers")
    os.makedirs(offers_dir, exist_ok=True)
    filename = f"Offer_{offer.offer_reference}_{uuid4().hex[:8]}.pdf"
    filepath = os.path.join(offers_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontSize=18,
        leading=22,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
    )
    company_style = ParagraphStyle(
        "CompanyHeader",
        parent=styles["Normal"],
        fontSize=12,
        leading=16,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0058be"),
    )
    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        fontName="Helvetica",
        textColor=colors.HexColor("#64748b"),
    )
    body_style = ParagraphStyle(
        "LetterBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        fontName="Helvetica",
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        fontName="Helvetica",
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph(f"<b>{context['company_name'].upper()}</b>", company_style),
            Paragraph(f"<b>OFFICIAL OFFER LETTER</b><br/><font color='#64748b'>Ref: {offer.offer_reference}</font>", meta_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[4.0 * inch, 3.2 * inch])
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0058be"), spaceAfter=15))

    # 2. Date & Recipient
    today_str = timezone.now().strftime("%B %d, %Y")
    story.append(Paragraph(f"<b>Date:</b> {today_str}", meta_style))
    story.append(Paragraph(f"<b>To:</b> {context['candidate_name']}", meta_style))
    story.append(Paragraph(f"<b>Position:</b> {context['job_title']}", meta_style))
    story.append(Spacer(1, 15))

    # 3. Main Letter Body
    paragraphs = letter_body.split("\n\n")
    for para in paragraphs:
        cleaned_para = para.strip().replace("\n", "<br/>")
        if cleaned_para:
            story.append(Paragraph(cleaned_para, body_style))
            story.append(Spacer(1, 10))

    story.append(Spacer(1, 10))

    # 4. Compensation & Critical Terms Summary Box
    summary_data = [
        [Paragraph("Compensation & Terms", table_cell_bold), Paragraph("Details", table_cell_bold)],
        [Paragraph("Annual Base Salary", table_cell), Paragraph(f"<b>{context['salary']}</b>", table_cell)],
        [Paragraph("Pay Frequency", table_cell), Paragraph(context["pay_frequency"], table_cell)],
        [Paragraph("Sign-on Bonus", table_cell), Paragraph(context["sign_on_bonus"], table_cell)],
        [Paragraph("Performance Bonus", table_cell), Paragraph(context["bonus"], table_cell)],
        [Paragraph("Equity Grant Package", table_cell), Paragraph(context["equity"], table_cell)],
        [Paragraph("Anticipated Start Date", table_cell), Paragraph(context["start_date"], table_cell)],
        [Paragraph("Offer Expiration Deadline", table_cell), Paragraph(f"<font color='#b91c1c'><b>{context['expiration_date']}</b></font>", table_cell)],
        [Paragraph("Work Arrangement", table_cell), Paragraph(context["work_arrangement"], table_cell)],
        [Paragraph("Reporting Manager", table_cell), Paragraph(context["hiring_manager"], table_cell)],
    ]
    summary_table = Table(summary_data, colWidths=[2.5 * inch, 4.7 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # 5. Sign-off & Electronic Record
    signoff_data = [
        [
            Paragraph("<b>Authorized Signatory</b><br/><br/>____________________________<br/>" + context["hiring_manager"], meta_style),
            Paragraph("<b>Candidate Acceptance</b><br/><br/>Electronic Record in ERMS Candidate Portal<br/><font color='#16a34a'>Verified Platform Dispatch</font>", meta_style),
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[3.6 * inch, 3.6 * inch])
    signoff_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(signoff_table)

    doc.build(story)

    # Return relative media URL
    return f"{settings.MEDIA_URL.rstrip('/')}/offers/{filename}"
