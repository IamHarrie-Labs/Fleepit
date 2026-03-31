from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Preformatted, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import re

# ── Output path ────────────────────────────────────────────────────────────────
OUTPUT = r"C:\Users\IamHarrie\Desktop\Agentic Workflow\Mantle contest\ARTICLE.pdf"
INPUT  = r"C:\Users\IamHarrie\Desktop\Agentic Workflow\Mantle contest\ARTICLE.md"

# ── Colour palette ─────────────────────────────────────────────────────────────
MANTLE_TEAL   = colors.HexColor("#00C2A8")   # accent
DARK_BG       = colors.HexColor("#0F1923")   # header bg
OFF_WHITE     = colors.HexColor("#F5F5F5")
MID_GREY      = colors.HexColor("#4A4A4A")
CODE_BG       = colors.HexColor("#1E2A35")
CODE_FG       = colors.HexColor("#C5E8D8")
RULE_COLOR    = colors.HexColor("#2A3F52")
IMG_NOTE_BG   = colors.HexColor("#E8F8F5")
IMG_NOTE_FG   = colors.HexColor("#007A69")

# ── Document ───────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2.4*cm, rightMargin=2.4*cm,
    topMargin=2.2*cm,  bottomMargin=2.2*cm,
    title="Fleepit — Building a DeFi Intelligence Platform on Mantle",
    author="Fleepit",
)

W = A4[0] - 4.8*cm   # usable text width

# ── Styles ─────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

title_style = S("ArticleTitle",
    fontName="Helvetica-Bold", fontSize=22, leading=28,
    textColor=OFF_WHITE, backColor=DARK_BG,
    spaceAfter=4, spaceBefore=0,
    leftIndent=12, rightIndent=12, borderPadding=(14, 12, 8, 12),
    alignment=TA_LEFT,
)
subtitle_style = S("ArticleSubtitle",
    fontName="Helvetica-Oblique", fontSize=11, leading=16,
    textColor=MANTLE_TEAL, backColor=DARK_BG,
    spaceAfter=0, spaceBefore=0,
    leftIndent=12, rightIndent=12, borderPadding=(0, 12, 14, 12),
    alignment=TA_LEFT,
)
h2_style = S("H2",
    fontName="Helvetica-Bold", fontSize=14, leading=19,
    textColor=DARK_BG, spaceBefore=18, spaceAfter=6,
    borderPadding=(0, 0, 4, 0),
)
body_style = S("Body",
    fontName="Helvetica", fontSize=10.5, leading=16,
    textColor=MID_GREY, spaceBefore=0, spaceAfter=8,
    alignment=TA_JUSTIFY,
)
body_bold_style = S("BodyBold",
    parent=body_style,
    fontName="Helvetica-Bold",
    textColor=colors.HexColor("#222222"),
)
bullet_style = S("Bullet",
    fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=MID_GREY, spaceBefore=1, spaceAfter=1,
    leftIndent=20, firstLineIndent=-12,
)
code_style = S("Code",
    fontName="Courier", fontSize=8.8, leading=13,
    textColor=CODE_FG, backColor=CODE_BG,
    spaceBefore=6, spaceAfter=6,
    leftIndent=10, rightIndent=10,
    borderPadding=(8, 10, 8, 10),
    borderColor=MANTLE_TEAL, borderWidth=0,
)
img_note_style = S("ImgNote",
    fontName="Helvetica-Oblique", fontSize=9, leading=13,
    textColor=IMG_NOTE_FG, backColor=IMG_NOTE_BG,
    spaceBefore=4, spaceAfter=10,
    leftIndent=10, borderPadding=(5, 10, 5, 10),
    borderColor=MANTLE_TEAL, borderWidth=1,
)
rule_style = S("Rule")
italic_style = S("Italic",
    fontName="Helvetica-Oblique", fontSize=10, leading=15,
    textColor=colors.HexColor("#666666"),
    spaceAfter=10, spaceBefore=4,
    alignment=TA_CENTER,
)
footer_style = S("Footer",
    fontName="Helvetica-Oblique", fontSize=8.5, leading=12,
    textColor=colors.HexColor("#888888"),
    spaceBefore=16, alignment=TA_CENTER,
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def escape(text):
    """Escape XML special chars for ReportLab Paragraph."""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )

def inline_bold(text):
    """Convert **word** to <b>word</b> for ReportLab."""
    return re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', escape(text))

def inline_code(text):
    """Convert `code` to monospace span."""
    return re.sub(
        r'`([^`]+)`',
        r'<font name="Courier" size="9" color="#007A69">\1</font>',
        text
    )

def process_inline(text):
    return inline_code(inline_bold(escape(text)))

# ── Parse markdown → flowable list ────────────────────────────────────────────

def parse_md(md_text):
    story = []
    lines = md_text.splitlines()
    i = 0
    in_code = False
    code_buf = []
    title_done = False

    while i < len(lines):
        line = lines[i]

        # ── Fenced code block ──────────────────────────────────────────────────
        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_buf = []
            else:
                in_code = False
                code_text = "\n".join(code_buf)
                story.append(Preformatted(code_text, code_style))
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        stripped = line.strip()

        # ── Blank line ─────────────────────────────────────────────────────────
        if not stripped:
            i += 1
            continue

        # ── Horizontal rule ────────────────────────────────────────────────────
        if stripped in ("---", "***", "___"):
            story.append(Spacer(1, 6))
            story.append(HRFlowable(width="100%", thickness=0.8,
                                     color=RULE_COLOR, spaceAfter=6))
            i += 1
            continue

        # ── H1 — article title (first occurrence only) ─────────────────────────
        if stripped.startswith("# ") and not title_done:
            title_text = escape(stripped[2:])
            story.append(Paragraph(title_text, title_style))
            title_done = True
            i += 1
            continue

        # ── Subtitle (italic paragraph right after title) ──────────────────────
        if stripped.startswith("*") and stripped.endswith("*") and title_done and len(story) <= 3:
            sub = escape(stripped.strip("*"))
            story.append(Paragraph(sub, subtitle_style))
            story.append(Spacer(1, 18))
            i += 1
            continue

        # ── H2 ─────────────────────────────────────────────────────────────────
        if stripped.startswith("## "):
            heading = escape(stripped[3:])
            story.append(Spacer(1, 4))
            story.append(Paragraph(heading, h2_style))
            story.append(HRFlowable(width="40%", thickness=2,
                                     color=MANTLE_TEAL, spaceAfter=4,
                                     hAlign="LEFT"))
            i += 1
            continue

        # ── Screenshot placeholder [IMG-N: description] ────────────────────────
        if stripped.startswith("[IMG-"):
            note = escape(stripped.lstrip("[").rstrip("]"))
            story.append(Paragraph(f"📷  {note}", img_note_style))
            i += 1
            continue

        # ── Bullet list ────────────────────────────────────────────────────────
        if stripped.startswith("- "):
            bullet_text = process_inline(stripped[2:])
            story.append(Paragraph(f"• &nbsp; {bullet_text}", bullet_style))
            i += 1
            continue

        # ── Inline code-only lines (no fences) ────────────────────────────────
        if stripped.startswith("`") and stripped.endswith("`") and stripped.count("`") == 2:
            code = escape(stripped.strip("`"))
            story.append(Preformatted(code, code_style))
            i += 1
            continue

        # ── Footer line (starts with "Built with") ────────────────────────────
        if stripped.startswith("Built with"):
            story.append(HRFlowable(width="100%", thickness=0.5,
                                     color=RULE_COLOR, spaceAfter=6))
            story.append(Paragraph(escape(stripped), footer_style))
            i += 1
            continue

        # ── Regular paragraph ──────────────────────────────────────────────────
        para = process_inline(stripped)
        story.append(Paragraph(para, body_style))
        i += 1

    return story

# ── Build ──────────────────────────────────────────────────────────────────────

with open(INPUT, "r", encoding="utf-8") as f:
    md = f.read()

story = parse_md(md)
doc.build(story)
print(f"PDF written: {OUTPUT}")
