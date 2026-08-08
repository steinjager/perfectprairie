#!/usr/bin/env python3
"""Build the Perfect Prairie seven-post square social campaign."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "social"
IMAGES = ROOT / "public" / "images"
SIZE = 1080

FOREST = "#173A2A"
DEEP = "#0D2B1E"
CREAM = "#F4F0DF"
PAPER = "#FBF8EE"
SUN = "#E4D534"
MOSS = "#737B2B"
INK = "#16261D"

GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


def cover(path: Path, size=(SIZE, SIZE), focal=(0.5, 0.5)):
    image = Image.open(path).convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, min(image.width - size[0], round((image.width - size[0]) * focal[0])))
    top = max(0, min(image.height - size[1], round((image.height - size[1]) * focal[1])))
    return image.crop((left, top, left + size[0], top + size[1]))


def overlay_gradient(image, top_alpha=30, bottom_alpha=210):
    shade = Image.new("RGBA", image.size)
    pixels = shade.load()
    for y in range(image.height):
        alpha = round(top_alpha + (bottom_alpha - top_alpha) * y / (image.height - 1))
        for x in range(image.width):
            pixels[x, y] = (9, 33, 22, alpha)
    return Image.alpha_composite(image.convert("RGBA"), shade)


def brand(draw, x=76, y=70, color=SUN, right=False):
    label = "PERFECT PRAIRIE"
    f = font(ARIAL_BOLD, 28)
    width = draw.textbbox((0, 0), label, font=f)[2]
    if right:
        x -= width
    draw.text((x, y), label, font=f, fill=color, stroke_width=0)
    draw.ellipse((x, y + 43, x + 10, y + 53), fill=color)
    draw.line((x + 23, y + 48, x + 108, y + 48), fill=color, width=3)


def footer(draw, color=CREAM, text="PERFECTPRAIRIE.COM"):
    f = font(ARIAL_BOLD, 21)
    draw.text((76, 1010), text, font=f, fill=color)


def multiline(draw, xy, lines, size, color, spacing=0.92, italic_last=False, align="left"):
    x, y = xy
    normal = font(GEORGIA_BOLD, size)
    italic = font(GEORGIA, size)
    for idx, line in enumerate(lines):
        active = italic if italic_last and idx == len(lines) - 1 else normal
        if align == "center":
            box = draw.textbbox((0, 0), line, font=active)
            tx = x - (box[2] - box[0]) / 2
        else:
            tx = x
        draw.text((tx, y), line, font=active, fill=color)
        y += round(size * spacing)


def save(image, number, slug):
    path = OUT / f"{number:02d}-{slug}.jpg"
    image.convert("RGB").save(path, "JPEG", quality=92, optimize=True, progressive=True)
    return path


def post_1():
    canvas = overlay_gradient(cover(IMAGES / "hero-prairie.webp", focal=(0.48, 0.54)), 16, 224)
    draw = ImageDraw.Draw(canvas)
    brand(draw)
    draw.text((76, 595), "LESS LAWN.", font=font(ARIAL_BOLD, 29), fill=SUN)
    multiline(draw, (72, 647), ["More habitat."], 104, CREAM, .9, italic_last=True)
    footer(draw)
    return save(canvas, 1, "less-lawn-more-habitat")


def post_2():
    canvas = cover(OUT / "source-lawn-to-prairie.png", focal=(0.55, 0.52)).convert("RGBA")
    veil = Image.new("RGBA", (SIZE, 380), (244, 240, 223, 242))
    canvas.alpha_composite(veil, (0, 700))
    draw = ImageDraw.Draw(canvas)
    brand(draw, color=CREAM)
    multiline(draw, (70, 738), ["Less lawn.", "More habitat."], 78, FOREST, .92)
    footer(draw, color=MOSS)
    return save(canvas, 2, "less-lawn-more-habitat")


def post_3():
    photo = cover(OUT / "source-pollinator.png", focal=(0.57, 0.48))
    canvas = Image.new("RGB", (SIZE, SIZE), FOREST)
    canvas.paste(photo.crop((390, 0, 1080, 1080)), (390, 0))
    draw = ImageDraw.Draw(canvas)
    brand(draw, x=62, color=SUN)
    multiline(draw, (58, 350), ["Plant", "for the", "pollinators."], 66, CREAM, 1.0, italic_last=True)
    draw.text((59, 840), "NECTAR · SHELTER · LIFE", font=font(ARIAL_BOLD, 19), fill=SUN)
    footer(draw, color=CREAM)
    return save(canvas, 3, "plant-for-pollinators")


def post_4():
    canvas = cover(IMAGES / "illinois-wildflowers.jpg", focal=(0.52, 0.52)).convert("RGBA")
    card = Image.new("RGBA", (800, 430), (13, 43, 30, 234))
    canvas.alpha_composite(card, (0, 558))
    draw = ImageDraw.Draw(canvas)
    brand(draw, color=DEEP)
    multiline(draw, (70, 600), ["Wild by nature.", "Intentional", "by design."], 66, CREAM, .96, italic_last=True)
    draw.rectangle((70, 936, 240, 944), fill=SUN)
    return save(canvas, 4, "wild-by-nature")


def post_5():
    canvas = Image.new("RGB", (SIZE, SIZE), CREAM)
    photo = cover(IMAGES / "hero-prairie.webp", size=(570, 930), focal=(0.62, 0.5))
    mask = Image.new("L", (570, 930), 255)
    rounded = ImageDraw.Draw(mask)
    rounded.ellipse((0, -285, 570, 285), fill=255)
    canvas.paste(photo, (510, 0), mask)
    draw = ImageDraw.Draw(canvas)
    brand(draw, x=64, color=MOSS)
    draw.text((62, 300), "A PRAIRIE", font=font(ARIAL_BOLD, 24), fill=MOSS)
    multiline(draw, (58, 350), ["Comes back", "year after", "year."], 67, FOREST, 1.0, italic_last=True)
    draw.text((62, 785), "DEEP ROOTS. LESS INPUT.", font=font(ARIAL_BOLD, 19), fill=MOSS)
    footer(draw, color=FOREST)
    return save(canvas, 5, "year-after-year")


def post_6():
    canvas = Image.new("RGB", (SIZE, SIZE), PAPER)
    archival = cover(IMAGES / "prairie-spirit-1915.jpg", size=(912, 545), focal=(0.5, 0.55))
    archival = archival.filter(ImageFilter.UnsharpMask(radius=1, percent=90, threshold=3))
    canvas.paste(archival, (84, 285))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((66, 267, 1014, 848), outline=FOREST, width=5)
    brand(draw, color=MOSS)
    multiline(draw, (540, 860), ["Illinois has a", "long memory."], 57, FOREST, .93, italic_last=True, align="center")
    draw.text((540, 1008), "ARCHIVE IMAGE · 1915", font=font(ARIAL_BOLD, 17), fill=MOSS, anchor="mm")
    return save(canvas, 6, "illinois-long-memory")


def post_7():
    canvas = overlay_gradient(cover(IMAGES / "work" / "central-illinois-pollinator-garden.jpg", focal=(0.5, 0.48)), 64, 220)
    draw = ImageDraw.Draw(canvas)
    brand(draw)
    draw.rounded_rectangle((105, 270, 975, 865), radius=38, fill=(244, 240, 223, 236), outline=SUN, width=5)
    draw.text((540, 338), "YOUR PATCH OF EARTH", font=font(ARIAL_BOLD, 25), fill=MOSS, anchor="ma")
    multiline(draw, (540, 430), ["Can start", "here."], 92, FOREST, .9, italic_last=True, align="center")
    draw.rounded_rectangle((315, 700, 765, 780), radius=40, fill=SUN)
    draw.text((540, 740), "REQUEST A FREE ESTIMATE", font=font(ARIAL_BOLD, 20), fill=DEEP, anchor="mm")
    footer(draw)
    return save(canvas, 7, "start-here")


def generate_og():
    width, height = 1200, 630
    canvas = cover(IMAGES / "hero-prairie.webp", size=(width, height), focal=(0.48, 0.53)).convert("RGBA")
    canvas = Image.alpha_composite(canvas, Image.new("RGBA", (width, height), (8, 35, 23, 162)))
    draw = ImageDraw.Draw(canvas)
    brand(draw, x=64, y=58, color=SUN)
    draw.text((65, 300), "LESS LAWN.", font=font(ARIAL_BOLD, 25), fill=SUN)
    multiline(draw, (60, 346), ["More habitat."], 82, CREAM, .9, italic_last=True)
    draw.text((65, 565), "PERFECTPRAIRIE.COM", font=font(ARIAL_BOLD, 20), fill=CREAM)
    canvas.convert("RGB").save(ROOT / "public" / "og-perfect-prairie.png", "PNG", optimize=True)


def generate_favicon():
    icon = Image.new("RGBA", (256, 256), PAPER)
    draw = ImageDraw.Draw(icon)
    center = 128
    for angle in range(0, 360, 45):
        import math
        radians = math.radians(angle)
        px = center + math.cos(radians) * 60
        py = center + math.sin(radians) * 60
        draw.ellipse((px - 28, py - 42, px + 28, py + 42), fill=SUN, outline=MOSS, width=4)
    draw.ellipse((82, 82, 174, 174), fill=FOREST, outline=DEEP, width=5)
    draw.ellipse((108, 108, 148, 148), fill="#624226")
    icon.save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (128, 128), (256, 256)])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    required = [OUT / "source-lawn-to-prairie.png", OUT / "source-pollinator.png"]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit("Missing generated source images:\n" + "\n".join(missing))
    outputs = [post_1(), post_2(), post_3(), post_4(), post_5(), post_6(), post_7()]
    thumb = 420
    gutter = 24
    contact = Image.new("RGB", (thumb * 4 + gutter * 5, thumb * 2 + gutter * 3), DEEP)
    for index, path in enumerate(outputs):
        tile = Image.open(path).convert("RGB").resize((thumb, thumb), Image.Resampling.LANCZOS)
        x = gutter + (index % 4) * (thumb + gutter)
        y = gutter + (index // 4) * (thumb + gutter)
        contact.paste(tile, (x, y))
    contact.save(OUT / "campaign-contact-sheet.jpg", "JPEG", quality=91, optimize=True)
    generate_og()
    generate_favicon()
    print("\n".join(str(path) for path in outputs))


if __name__ == "__main__":
    main()
