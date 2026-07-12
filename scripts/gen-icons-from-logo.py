#!/usr/bin/env python3
"""Generate July Plan launcher icons from the user's custom logo image.
Resizes the logo to all required Android mipmap densities + splash screens.
"""
from PIL import Image
import os

ANDROID = "/home/z/my-project/android/app/src/main/res"
LOGO_PATH = "/home/z/my-project/public/logo.png"

# densities -> px size for launcher icons
SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

# Foreground for adaptive icons (transparent padding)
FG_SIZES = {
    "mipmap-mdpi":    108,
    "mipmap-hdpi":    162,
    "mipmap-xhdpi":   216,
    "mipmap-xxhdpi":  324,
    "mipmap-xxxhdpi": 432,
}

# Splash screen sizes
SPLASH_SIZES = {
    "drawable-port-mdpi":    160,
    "drawable-port-hdpi":    240,
    "drawable-port-xhdpi":   320,
    "drawable-port-xxhdpi":  480,
    "drawable-port-xxxhdpi": 640,
    "drawable-land-mdpi":    160,
    "drawable-land-hdpi":    240,
    "drawable-land-xhdpi":   320,
    "drawable-land-xxhdpi":  480,
    "drawable-land-xxxhdpi": 640,
}

def main():
    # Load the user's logo
    logo = Image.open(LOGO_PATH).convert("RGBA")
    print(f"Loaded logo: {logo.size[0]}x{logo.size[1]}")

    # Generate launcher icons (ic_launcher + ic_launcher_round)
    for density, sz in SIZES.items():
        out_dir = os.path.join(ANDROID, density)
        os.makedirs(out_dir, exist_ok=True)
        icon = logo.resize((sz, sz), Image.LANCZOS)
        icon.save(os.path.join(out_dir, "ic_launcher.png"))
        icon.save(os.path.join(out_dir, "ic_launcher_round.png"))
        print(f"  wrote {density}/ic_launcher.png ({sz}x{sz})")

    # Generate foreground for adaptive icons (with padding)
    for density, sz in FG_SIZES.items():
        out_dir = os.path.join(ANDROID, density)
        if not os.path.exists(out_dir):
            continue
        # Create transparent canvas with centered logo (66% of size)
        fg = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        logo_sz = int(sz * 0.66)
        logo_resized = logo.resize((logo_sz, logo_sz), Image.LANCZOS)
        offset = ((sz - logo_sz) // 2, (sz - logo_sz) // 2)
        fg.paste(logo_resized, offset, logo_resized)
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

    # Generate splash screens
    for d in os.listdir(ANDROID):
        if d.startswith("drawable-port-") or d.startswith("drawable-land-"):
            splash_path = os.path.join(ANDROID, d, "splash.png")
            if os.path.exists(splash_path):
                size = SPLASH_SIZES.get(d, 320)
                splash = Image.new("RGBA", (size, size), (249, 115, 22, 255))  # amber bg
                logo_sz = int(size * 0.4)
                logo_resized = logo.resize((logo_sz, logo_sz), Image.LANCZOS)
                offset = ((size - logo_sz) // 2, (size - logo_sz) // 2)
                splash.paste(logo_resized, offset, logo_resized)
                splash.save(splash_path)
                print(f"  wrote {d}/splash.png ({size}x{size})")

    # Also copy logo to favicon location
    favicon = os.path.join("/home/z/my-project/public", "logo.png")
    print(f"\nLogo is at: {favicon}")
    print("\nAll icons generated from user's custom logo.")

if __name__ == "__main__":
    main()
