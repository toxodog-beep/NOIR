from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "products"
OUT.mkdir(parents=True, exist_ok=True)

PRODUCTS = [
    ("axis-shield-black", "shield", "#050506", "#9db9ad"),
    ("velvet-tint-burgundy", "square", "#170b0f", "#8d2534"),
    ("noir-square-01", "square", "#050506", "#d8d8d0"),
    ("tortoise-arc", "optical", "#24140d", "#a66a43"),
    ("crossline-cat-eye", "cat", "#050506", "#d8d8d0"),
    ("rimless-ice", "rimless", "#071012", "#b8d4d0"),
    ("metal-orbit", "round", "#0b0d0e", "#d8d8d0"),
    ("lowrider-wrap", "wrap", "#050506", "#737b80"),
    ("spike-band-ring", "ring", "#050506", "#d8d8d0"),
    ("veil-pendant-necklace", "pendant", "#07070a", "#d8d8d0"),
    ("chain-loop-necklace", "chain", "#080808", "#c9c9c0"),
    ("mirror-signet-ring", "signet", "#050506", "#e8e5dc"),
    ("arch-rim-optical", "optical", "#0c0c10", "#c8c1b6"),
    ("blade-square-smoke", "blade", "#050608", "#7d8589"),
    ("clear-lens-club", "rimless", "#071012", "#d8d8d0"),
    ("onyx-link-ring", "ring", "#050506", "#7d8589"),
]


def svg_shell(slug, bg, accent, body):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 1120" role="img" aria-labelledby="title desc">
  <title id="title">{slug}</title>
  <desc id="desc">NOIR FRAME product artwork for {slug}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{bg}"/>
      <stop offset="0.58" stop-color="#101114"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <radialGradient id="glow" cx="32%" cy="18%" r="60%">
      <stop offset="0" stop-color="{accent}" stop-opacity=".34"/>
      <stop offset=".55" stop-color="{accent}" stop-opacity=".09"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#000" flood-opacity=".55"/>
    </filter>
  </defs>
  <rect width="960" height="1120" fill="url(#bg)"/>
  <rect width="960" height="1120" fill="url(#glow)"/>
  <rect y="910" width="960" height="210" fill="#000" opacity=".38"/>
  <g filter="url(#shadow)" stroke-linecap="round" stroke-linejoin="round">
{body}
  </g>
  <text x="80" y="990" fill="#f3f0e8" opacity=".82" font-family="Arial, sans-serif" font-size="36" letter-spacing="3">{slug.upper()}</text>
  <text x="80" y="1042" fill="{accent}" opacity=".72" font-family="Arial, sans-serif" font-size="22" letter-spacing="5">NOIR FRAME</text>
</svg>
"""


def eyewear(kind, accent):
    lens = f'fill="{accent}" fill-opacity=".28"'
    stroke = f'stroke="{accent}" stroke-width="13"'
    black_stroke = 'stroke="#050506" stroke-width="16"'
    highlight = 'stroke="#fff" stroke-opacity=".28" stroke-width="8"'

    if kind == "shield":
        main = f'<rect x="150" y="365" width="660" height="260" rx="96" {lens} {stroke}/>'
        bridge = f'<path d="M170 465 72 410 M790 465 888 410" {stroke}/>'
    elif kind == "wrap":
        main = f'<path d="M130 490c74-108 626-108 700 0v64c-86 106-614 106-700 0z" {lens} {stroke}/>'
        bridge = f'<path d="M110 466c112-128 628-128 740 0" fill="none" {stroke}/>'
    elif kind == "cat":
        main = f'<path d="M135 445 386 352l54 250-270 58z M825 445 574 352l-54 250 270 58z" {lens} {stroke}/>'
        bridge = f'<path d="M440 510h80" {stroke}/>'
    elif kind == "round":
        main = f'<circle cx="308" cy="500" r="126" {lens} {stroke}/><circle cx="652" cy="500" r="126" {lens} {stroke}/>'
        bridge = f'<path d="M434 500h92" {stroke}/>'
    elif kind == "rimless":
        main = f'<rect x="178" y="395" width="254" height="218" rx="72" fill="#c7f1ef" fill-opacity=".18" stroke="{accent}" stroke-width="6"/><rect x="528" y="395" width="254" height="218" rx="72" fill="#c7f1ef" fill-opacity=".18" stroke="{accent}" stroke-width="6"/>'
        bridge = f'<path d="M432 502h96" stroke="{accent}" stroke-width="7"/>'
    elif kind == "blade":
        main = f'<path d="M132 418 452 448 426 625 154 600z M828 418 508 448 534 625 806 600z" {lens} {stroke}/>'
        bridge = f'<path d="M452 508h56" {stroke}/>'
    else:
        main = f'<rect x="160" y="394" width="280" height="222" rx="68" {lens} {stroke}/><rect x="520" y="394" width="280" height="222" rx="68" {lens} {stroke}/>'
        bridge = f'<path d="M440 505h80" {stroke}/>'

    temples = f'<path d="M190 540 70 620 M770 540l120 80" {black_stroke}/>'
    shine = f'<path d="M226 430 372 575 M590 430l146 145" {highlight}/>'
    return f"    {main}\n    {bridge}\n    {temples}\n    {shine}"


def jewelry(kind, accent):
    stroke = f'stroke="{accent}"'
    if kind in {"ring", "signet"}:
        plate = ""
        if kind == "signet":
            plate = f'<rect x="360" y="322" width="240" height="150" rx="42" fill="{accent}" fill-opacity=".65" {stroke} stroke-width="8"/>'
        else:
            plate = "".join(
                f'<path d="M{x} 338 338 394h-48z" fill="#fff" fill-opacity=".2"/>'
                for x in range(326, 640, 64)
            )
        return f"""    <ellipse cx="480" cy="575" rx="230" ry="230" fill="#000" opacity=".24"/>
    <circle cx="480" cy="548" r="226" fill="none" {stroke} stroke-width="50"/>
    <circle cx="480" cy="548" r="126" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="18"/>
    {plate}"""
    if kind == "pendant":
        links = "\n".join(
            f'    <ellipse cx="{x}" cy="240" rx="25" ry="16" fill="none" {stroke} stroke-width="9"/>'
            for x in range(286, 696, 44)
        )
        return f"""{links}
    <path d="M480 260v236" {stroke} stroke-width="9"/>
    <path d="M480 496 384 710h192z" fill="{accent}" fill-opacity=".45" {stroke} stroke-width="10"/>"""

    links = "\n".join(
        f'    <rect x="{x}" y="{380 + (i % 2) * 46}" width="116" height="64" rx="34" fill="none" {stroke} stroke-width="14"/>'
        for i, x in enumerate(range(180, 760, 72))
    )
    return f"""{links}
    <circle cx="480" cy="662" r="98" fill="none" {stroke} stroke-width="22"/>"""


for slug, kind, bg, accent in PRODUCTS:
    body = jewelry(kind, accent) if kind in {"ring", "signet", "pendant", "chain"} else eyewear(kind, accent)
    (OUT / f"{slug}.svg").write_text(svg_shell(slug, bg, accent, body), encoding="utf-8")

(ROOT / "public").mkdir(exist_ok=True)
(ROOT / "public" / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    '<rect width="64" height="64" fill="#050506"/>'
    '<rect x="18" y="18" width="28" height="28" fill="#d8d8d0" transform="rotate(45 32 32)"/>'
    '<rect x="25" y="25" width="14" height="14" fill="#7a1f2b" transform="rotate(45 32 32)"/>'
    "</svg>",
    encoding="utf-8",
)

print(f"Generated {len(PRODUCTS)} SVG product images in {OUT}")
