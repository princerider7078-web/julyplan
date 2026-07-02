#!/usr/bin/env python3
"""Generate July Plan launcher icons (PNG) for all Android mipmap densities.

Brand: amber→orange gradient square with a white "J" letter (matches the
sidebar badge / dashboard aesthetic of the web app).
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

ANDROID = "/home/z/my-project/android/app/src/main/res"

# densities -> px size
SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}
# foreground (transparent background with the "J" symbol) — same densities
FG_SIZES = {
    "mipmap-mdpi":    108,
    "mipmap-hdpi":    162,
    "mipmap-xhdpi":   216,
    "mipmap-xxhdpi":  324,
    "mipmap-xxxhdpi": 432,
}

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

AMBER = (249, 115, 22)    # #f97316
DEEP = (180, 60, 0)       # darker bottom

def make_icon(size, with_bg=True):
    """Square icon with vertical amber→deep-orange gradient and a white 'J'."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_bg:
        radius = int(size * 0.22)
        # Render vertical gradient onto temp image, then mask to rounded rect
        grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        for y in range(size):
            t = y / max(1, size - 1)
            color = lerp(AMBER, DEEP, t)
            row = Image.new("RGBA", (size, 1), color + (255,))
            grad.paste(row, (0, y))
        mask = Image.new("L", (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        img.paste(grad, (0, 0), mask)
        draw = ImageDraw.Draw(img)

    # Draw a bold "J" letter centered
    font_size = int(size * 0.62)
    font = None
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    text = "J"
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (size - tw) // 2 - bbox[0]
        ty = (size - th) // 2 - bbox[1] - int(size * 0.04)
    except AttributeError:
        tw, th = draw.textsize(text, font=font)
        tx = (size - tw) // 2
        ty = (size - th) // 2 - int(size * 0.04)

    # Subtle shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.text((tx + int(size * 0.02), ty + int(size * 0.03)), text, font=font, fill=(0, 0, 0, 80))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    return img


def make_foreground(size):
    """Adaptive icon foreground: just the 'J' on transparent bg, centered."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font_size = int(size * 0.55)
    font = None
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()
    text = "J"
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (size - tw) // 2 - bbox[0]
        ty = (size - th) // 2 - bbox[1] - int(size * 0.04)
    except AttributeError:
        tw, th = draw.textsize(text, font=font)
        tx = (size - tw) // 2
        ty = (size - th) // 2
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    return img


def main():
    # Main launcher icons (with background)
    for density, sz in SIZES.items():
        out_dir = os.path.join(ANDROID, density)
        os.makedirs(out_dir, exist_ok=True)
        img = make_icon(sz, with_bg=True)
        img.save(os.path.join(out_dir, "ic_launcher.png"))
        img.save(os.path.join(out_dir, "ic_launcher_round.png"))
        print(f"  wrote {density}/ic_launcher.png ({sz}x{sz})")

    # Foreground for adaptive icons (API 26+)
    for density, sz in FG_SIZES.items():
        out_dir = os.path.join(ANDROID, density)
        if not os.path.exists(out_dir):
            continue
        fg = make_foreground(sz)
        fg.save(os.path.join(out_dir, "ic_launcher_foreground.png"))
        print(f"  wrote {density}/ic_launcher_foreground.png ({sz}x{sz})")

    # Update ic_launcher_background.xml to amber
    bg_xml = os.path.join(ANDROID, "drawable", "ic_launcher_background.xml")
    with open(bg_xml, "w") as f:
        f.write("""<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="#f97316"
        android:pathData="M0,0h108v108h-108z" />
</vector>
""")
    print("  wrote drawable/ic_launcher_background.xml (amber)")

    # Splash screen — replace splash.png with amber color + white J
    for d in os.listdir(ANDROID):
        if d.startswith("drawable-port-") or d.startswith("drawable-land-"):
            splash_path = os.path.join(ANDROID, d, "splash.png")
            if os.path.exists(splash_path):
                size = 320
                if "xxxhdpi" in d: size = 640
                elif "xxhdpi" in d: size = 480
                elif "xhdpi" in d: size = 320
                elif "hdpi" in d: size = 240
                elif "mdpi" in d: size = 160
                splash = Image.new("RGBA", (size, size), (249, 115, 22, 255))
                draw = ImageDraw.Draw(splash)
                font_size = int(size * 0.4)
                try:
                    font = ImageFont.truetype(
                        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                        font_size,
                    )
                except Exception:
                    font = ImageFont.load_default()
                text = "J"
                try:
                    bbox = draw.textbbox((0, 0), text, font=font)
                    tw = bbox[2] - bbox[0]; th = bbox[3] - bbox[1]
                    tx = (size - tw) // 2 - bbox[0]
                    ty = (size - th) // 2 - bbox[1]
                except AttributeError:
                    tw, th = draw.textsize(text, font=font)
                    tx = (size - tw) // 2; ty = (size - th) // 2
                draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
                splash.save(splash_path)
                print(f"  wrote {d}/splash.png ({size}x{size})")

    print("\nAll icons generated.")


if __name__ == "__main__":
    main()
