"""Gera os SVGs do logo Colaja a partir de geometria simples (elipses, hastes e arcos)."""
import json
import math
from pathlib import Path

OUT = Path(__file__).parent / "final"
SITE = Path(__file__).parent.parent / "src" / "brand"
BLUE, YELLOW, WHITE, BLACK = "#2B3BFF", "#FFD21F", "#FFFFFF", "#000000"

T = 30                    # espessura das hastes
RX, RY = 64, 66           # bojo externo: 2 un de overshoot em cima e embaixo
IX, IY = 33, 38           # contraforma: traço de 31 nos lados e 28 em cima e embaixo
CY = 128
BASE, XH = 192, 64        # linha de base e topo da altura-x
ASC, DESC = 12, 244       # topo do ascendente e fundo do descendente
PAD = 64                  # área de respiro: meia altura-x


def f(n):
    return f"{n:.2f}".rstrip("0").rstrip(".")


def ellipse(cx, rx, ry, sweep):
    return (f"M{f(cx - rx)} {CY}A{rx} {ry} 0 1 {sweep} {f(cx + rx)} {CY}"
            f"A{rx} {ry} 0 1 {sweep} {f(cx - rx)} {CY}Z")


def letter_o(cx):
    return ellipse(cx, RX, RY, 1) + ellipse(cx, IX, IY, 0)


def letter_c(cx, cut=18):
    """Bojo aberto à direita, com terminais cortados na vertical como as hastes."""
    x = cx + cut
    yo = RY * math.sqrt(1 - (cut / RX) ** 2)
    yi = IY * math.sqrt(1 - (cut / IX) ** 2)
    return (f"M{f(x)} {f(CY - yo)}A{RX} {RY} 0 1 0 {f(x)} {f(CY + yo)}V{f(CY + yi)}"
            f"A{IX} {IY} 0 1 1 {f(x)} {f(CY - yi)}Z")


def letter_a(cx):
    """Bojo estreito encaixado na haste, num contorno único; a contraforma morde 4 un da haste."""
    bc, brx = cx - 4, 60
    sx = cx + RX - T
    dy = RY * math.sqrt(1 - ((sx - bc) / brx) ** 2)
    left, right = cx - RX + (RX - IX), sx + 4
    irx, icx = (right - left) / 2, (left + right) / 2
    outer = (f"M{f(sx)} {XH}H{f(sx + T)}V{BASE}H{f(sx)}V{f(CY + dy)}"
             f"A{brx} {RY} 0 1 1 {f(sx)} {f(CY - dy)}Z")
    return [outer + ellipse(icx, irx, IY + 2, 0)]


def stem(x, top, bottom):
    return f"M{f(x)} {top}H{f(x + T)}V{bottom}H{f(x)}Z"


def j_shape(x, w, top, bottom, ro, tail):
    """Haste com gancho para a esquerda."""
    ri = ro - w
    cx, cy = x + w - ro, bottom - ro
    return (f"M{f(x)} {top}H{f(x + w)}V{f(cy)}A{ro} {ro} 0 0 1 {f(cx)} {bottom}H{f(cx - tail)}V{bottom - w}H{f(cx)}"
            f"A{ri} {ri} 0 0 0 {f(x)} {f(cy)}Z")


def accent_shape(x, bottom, top, base):
    """Acento agudo: trapézio que abre para cima, com lados a 30° e 45° da vertical."""
    lean = (bottom - top) * math.tan(math.radians(30))
    cap = base + (bottom - top) - lean
    return f"M{f(x)} {bottom}L{f(x + lean)} {top}H{f(x + lean + cap)}L{f(x + base)} {bottom}Z"


def wordmark():
    """Devolve (letras, acento, largura)."""
    x, parts = 0, []
    parts.append(letter_c(x + RX)); x += RX + 18
    x += 14; parts.append(letter_o(x + RX)); x += 2 * RX
    x += 18; parts.append(stem(x, ASC, BASE)); x += T
    x += 18; parts += letter_a(x + RX); x += 2 * RX
    x += 28; parts.append(j_shape(x, T, XH, DESC, 50, 14))
    accent = accent_shape(x - 3, 46, ASC, 27); x += T
    x += 18; parts += letter_a(x + RX); x += 2 * RX
    return parts, accent, x


def write(name, box, body):
    x, y, w, h = box
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x)} {f(y)} {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" '
        f'role="img" aria-labelledby="t"><title id="t">Colaja</title>{body}</svg>\n', encoding="utf-8")


def build_wordmark(name, ink, accent_color, bg=None):
    letters, accent, w = wordmark()
    box = (-PAD, ASC - PAD, w + 2 * PAD, DESC - ASC + 2 * PAD)
    back = f'<rect x="{box[0]}" y="{box[1]}" width="{f(box[2])}" height="{box[3]}" fill="{bg}"/>' if bg else ""
    body = back + '<g id="wordmark">' + "".join(
        f'<path fill="{ink}" fill-rule="evenodd" d="{d}"/>' for d in letters) + f'<path fill="{accent_color}" d="{accent}"/></g>'
    write(name, box, body)


TILE = "M60 0H196A60 60 0 0 1 256 60V196A60 60 0 0 1 196 256H60A60 60 0 0 1 0 196V60A60 60 0 0 1 60 0Z"


def symbol_glyph(scale=1.0):
    """j próprio do símbolo: mais pesado que o do wordmark, centrado em 128/128."""
    body = j_shape(110, 38, 105, 213, 50, 16)
    accent = accent_shape(106, 83, 45, 32)
    if scale == 1.0:
        return body, accent, ""
    return body, accent, f' transform="translate({f(128 * (1 - scale))} {f(128 * (1 - scale))}) scale({scale})"'


def build_symbol(name, ink, accent_color, bg, scale=1.0):
    body, accent, tr = symbol_glyph(scale)
    tile = f'<path fill="{bg}" d="{TILE}"/>' if bg else ""
    write(name, (0, 0, 256, 256),
          f'{tile}<g id="symbol"{tr}><path fill="{ink}" d="{body}"/><path fill="{accent_color}" d="{accent}"/></g>')


def build_symbol_knockout(name, color):
    """Uma cor só: o j e o acento ficam vazados no quadrado."""
    body, accent, _ = symbol_glyph()
    write(name, (0, 0, 256, 256), f'<path fill="{color}" fill-rule="evenodd" d="{TILE}{body}{accent}"/>')


def build_site_files():
    """Leva a geometria para o site: caminhos do componente Logo e ícone do app."""
    letters, accent, w = wordmark()
    body, sym_accent, _ = symbol_glyph()
    SITE.mkdir(parents=True, exist_ok=True)
    (SITE / "logo.json").write_text(json.dumps({
        "wordmark": {"viewBox": f"0 0 {f(w)} 256", "letters": letters, "accent": accent},
        "symbol": {"viewBox": "0 0 256 256", "tile": TILE, "body": body, "accent": sym_accent},
    }, indent=2) + "\n", encoding="utf-8")
    icon = SITE.parent / "app" / "icon.svg"
    if icon.parent.exists():
        icon.write_text((OUT / "colaja-symbol-small.svg").read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    build_wordmark("colaja-wordmark-blue.svg", BLUE, BLUE)
    build_wordmark("colaja-wordmark-black.svg", BLACK, BLACK)
    build_wordmark("colaja-wordmark-white.svg", WHITE, WHITE)
    build_wordmark("colaja-wordmark-on-blue.svg", WHITE, YELLOW, BLUE)
    build_symbol("colaja-symbol.svg", WHITE, YELLOW, BLUE)
    build_symbol("colaja-symbol-small.svg", WHITE, YELLOW, BLUE, scale=1.18)
    build_symbol("colaja-glyph-blue.svg", BLUE, BLUE, None)
    build_symbol_knockout("colaja-symbol-mono.svg", BLACK)
    build_site_files()
    print("ok")
