#!/usr/bin/env python3
"""
Generate Android launcher icons + splash screens with BLACK background.
- Launcher icons: ic_launcher.png, ic_launcher_round.png (all densities) — black bg + centered logo
- Launcher foreground: ic_launcher_foreground.png — black bg + logo (for adaptive icon)
- Splash screens: splash.png (all portrait + landscape densities) — pure black bg + centered logo
"""
from PIL import Image, ImageDraw
import os

BASE = '/home/z/my-project'
LOGO = Image.open(f'{BASE}/public/logo.png').convert('RGBA')
RES = f'{BASE}/android/app/src/main/res'

# Android launcher icon sizes (px) per density
LAUNCHER_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

# Android splash sizes (px) per density — portrait
# Capacitor uses drawable-port-* for splash
SPLASH_PORTRAIT = {
    'drawable-port-mdpi': (480, 800),
    'drawable-port-hdpi': (720, 1280),
    'drawable-port-xhdpi': (960, 1600),
    'drawable-port-xxhdpi': (1440, 2560),
    'drawable-port-xxxhdpi': (1920, 3200),
}

SPLASH_LANDSCAPE = {
    'drawable-land-mdpi': (800, 480),
    'drawable-land-hdpi': (1280, 720),
    'drawable-land-xhdpi': (1600, 960),
    'drawable-land-xxhdpi': (2560, 1440),
    'drawable-land-xxxhdpi': (3200, 1920),
}

# Also the default drawable (fallback)
SPLASH_DEFAULT = {
    'drawable': (960, 1600),  # portrait default
}

def make_round_mask(size):
    """Create a circular alpha mask for round icons."""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, size, size], fill=255)
    return mask

def composite_on_black(logo, target_size, logo_scale=0.62, round_icon=False):
    """
    Create a target_size x target_size image with pure black background
    and the logo centered, scaled to logo_scale of the size.
    """
    bg = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 255))
    logo_size = int(target_size * logo_scale)
    resized_logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
    offset = ((target_size - logo_size) // 2, (target_size - logo_size) // 2)
    bg.paste(resized_logo, offset, resized_logo)  # use logo's alpha as mask

    if round_icon:
        mask = make_round_mask(target_size)
        # Apply round mask — corners become transparent, but we want black corners for round icon
        # Actually for round icon, the visible area is the circle, corners are clipped by Android
        # So we just composite normally — Android handles the circular crop
        pass

    return bg.convert('RGB')  # flatten to RGB (black bg, no alpha needed)

def make_splash(logo, width, height, logo_scale=0.28):
    """
    Create a splash screen: pure black background + centered logo.
    Logo scale is relative to the smaller dimension.
    """
    bg = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    logo_size = int(min(width, height) * logo_scale)
    resized_logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
    offset = ((width - logo_size) // 2, (height - logo_size) // 2)
    bg.paste(resized_logo, offset, resized_logo)
    return bg.convert('RGB')

print("Generating launcher icons (black bg + logo)...")
for folder, size in LAUNCHER_SIZES.items():
    out_dir = f'{RES}/{folder}'
    os.makedirs(out_dir, exist_ok=True)
    # Square launcher icon
    icon = composite_on_black(LOGO, size, logo_scale=0.62)
    icon.save(f'{out_dir}/ic_launcher.png', 'PNG')
    # Round launcher icon (same image, Android clips it to circle)
    icon_round = composite_on_black(LOGO, size, logo_scale=0.62, round_icon=True)
    icon_round.save(f'{out_dir}/ic_launcher_round.png', 'PNG')
    # Foreground for adaptive icon — black bg + larger logo (adaptive icon crops edges)
    fg = composite_on_black(LOGO, size, logo_scale=0.5)
    fg.save(f'{out_dir}/ic_launcher_foreground.png', 'PNG')
    print(f"  {folder}: {size}x{size} ✓")

print("\nGenerating splash screens (black bg + centered logo)...")
for folder, (w, h) in {**SPLASH_PORTRAIT, **SPLASH_LANDSCAPE, **SPLASH_DEFAULT}.items():
    out_dir = f'{RES}/{folder}'
    os.makedirs(out_dir, exist_ok=True)
    splash = make_splash(LOGO, w, h, logo_scale=0.25)
    splash.save(f'{out_dir}/splash.png', 'PNG')
    print(f"  {folder}: {w}x{h} ✓")

print("\n✅ All icons + splash screens generated with BLACK background.")
