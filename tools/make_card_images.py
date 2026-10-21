"""一覧カード用の軽い画像（WebP）を images/cards/ に作るスクリプト。

一覧では小さく表示するだけなので、元画像（1〜6MB）の代わりに
幅720pxほどのWebP（数十KB）を表示する。元画像は拡大表示（モーダル）で使う。

使い方（リポジトリの直下で実行）:
    pip install pillow
    python tools/make_card_images.py

すでにカード画像がある作品はスキップする。カード画像がない作品は
サイト側で自動的に元画像が表示されるので、実行し忘れても表示は壊れない。
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "images" / "cards"
MAX_WIDTH = 720
QUALITY = 78


def card_sources(work):
    if work.get("type") == "image":
        return [work.get("image")]
    if work.get("type") == "gallery":
        return (work.get("images") or [])[:1]
    return [work.get("thumbnail")]


def main():
    works = json.loads((ROOT / "data" / "works.json").read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    made = 0
    for work in works:
        for src in card_sources(work):
            if not src:
                continue
            src_path = ROOT / src
            dest = OUT_DIR / (Path(src).stem + ".webp")
            if dest.exists() or not src_path.exists():
                continue
            with Image.open(src_path) as im:
                im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
                if im.width > MAX_WIDTH:
                    im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
                im.save(dest, "WEBP", quality=QUALITY, method=6)
            made += 1
            print(f"作成: {dest.relative_to(ROOT)}")
    print(f"完了（新しく作った画像: {made}件）")


if __name__ == "__main__":
    main()
