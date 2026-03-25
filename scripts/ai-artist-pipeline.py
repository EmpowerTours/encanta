"""
Encanta AI Artist Content Generation Pipeline
=============================================
Generates prompts and content for AI seed artists using Grok API.
Each artist gets: photo sets (lencería, topless, cuerpo) + video prompts.
All content is FACELESS — neck down only.

Usage:
  pip install requests
  export GROK_API_KEY=your_key_here
  python ai-artist-pipeline.py --generate-prompts     # outputs prompts JSON
  python ai-artist-pipeline.py --generate-images      # calls Grok API for images
  python ai-artist-pipeline.py --generate-videos      # calls Grok API for videos
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

# ── AI Artist Profiles ────────────────────────────────────────────────────────

ARTISTS = [
    {
        "id": "luna-noir",
        "stage_name": "Luna Noir",
        "bio": "Explorando la oscuridad y la elegancia. Cada foto es un juego entre sombras y piel. Mi arte vive donde la luz se encuentra con el misterio.",
        "style": "dark, moody, high contrast, shadows",
        "skin_tone": "light/fair skin",
        "body_type": "slim, toned",
        "hair": "long dark hair falling on shoulders",
        "setting": "dark studio, silk sheets, dim lighting",
        "categories": ["lenceria", "cuerpo"],
    },
    {
        "id": "valentina-rose",
        "stage_name": "Valentina Rose",
        "bio": "Romántica y cálida. Creo contenido que celebra las curvas y la feminidad con luz dorada y poses naturales.",
        "style": "warm, romantic, golden hour, soft",
        "skin_tone": "medium/olive skin",
        "body_type": "curvy, feminine",
        "hair": "wavy brown hair",
        "setting": "bedroom, warm golden light, white sheets",
        "categories": ["topless", "cuerpo"],
    },
    {
        "id": "carmela-fuego",
        "stage_name": "Carmela Fuego",
        "bio": "Audaz y directa. No hay timidez en mi arte. Cada pose es intencional, cada ángulo es poder.",
        "style": "bold, fiery, red tones, high energy",
        "skin_tone": "tan/bronze skin",
        "body_type": "athletic, toned",
        "hair": "straight black hair",
        "setting": "red lighting, leather furniture, urban loft",
        "categories": ["lenceria", "video"],
    },
    {
        "id": "isabelle-nox",
        "stage_name": "Isabelle Nox",
        "bio": "Misteriosa por naturaleza. Mi contenido es arte que te deja queriendo más. Nunca revelo todo.",
        "style": "mysterious, noir, dramatic shadows",
        "skin_tone": "dark/rich skin",
        "body_type": "tall, statuesque",
        "hair": "short natural hair",
        "setting": "dark room, single light source, minimalist",
        "categories": ["cuerpo", "topless"],
    },
    {
        "id": "serena-mist",
        "stage_name": "Serena Mist",
        "bio": "Suave como la seda. Mi estilo es delicado, soñador y etéreo. Arte que acaricia los ojos.",
        "style": "soft, dreamy, pastel, ethereal",
        "skin_tone": "light/porcelain skin",
        "body_type": "petite, delicate",
        "hair": "blonde hair loosely tied",
        "setting": "sheer curtains, soft natural light, pastel bedroom",
        "categories": ["lenceria", "cuerpo"],
    },
    {
        "id": "dahlia-ember",
        "stage_name": "Dahlia Ember",
        "bio": "Artística y atrevida. Juego con ángulos que otros no se atreven a explorar. Mi cuerpo es mi lienzo.",
        "style": "edgy, artistic, experimental angles",
        "skin_tone": "medium/warm skin",
        "body_type": "fit, athletic",
        "hair": "dark hair with highlights",
        "setting": "art studio, paint splatters, industrial",
        "categories": ["topless", "video"],
    },
    {
        "id": "camila-velvet",
        "stage_name": "Camila Velvet",
        "bio": "Lujo y sensualidad. Cada foto mía parece sacada de una revista de alta moda. Elegancia sin rostro.",
        "style": "luxurious, high fashion, glossy",
        "skin_tone": "tan/golden skin",
        "body_type": "curvy, voluptuous",
        "hair": "long flowing dark hair",
        "setting": "luxury hotel, velvet furniture, champagne tones",
        "categories": ["lenceria", "topless"],
    },
    {
        "id": "aria-eclipse",
        "stage_name": "Aria Eclipse",
        "bio": "Minimalista. Menos es más. Un solo rayo de luz, una pose, y toda la historia se cuenta.",
        "style": "minimalist, clean, single light",
        "skin_tone": "dark/ebony skin",
        "body_type": "lean, graceful",
        "hair": "braided hair",
        "setting": "white backdrop, single spotlight, clean lines",
        "categories": ["cuerpo", "video"],
    },
    {
        "id": "sofia-luna",
        "stage_name": "Sofia Luna",
        "bio": "Juguetona y natural. No todo tiene que ser serio — mi contenido tiene energía, movimiento y vida.",
        "style": "playful, natural, bright, energetic",
        "skin_tone": "light/medium skin",
        "body_type": "natural, girl-next-door",
        "hair": "messy brunette hair",
        "setting": "sunny room, messy bed, morning light",
        "categories": ["lenceria", "video"],
    },
    {
        "id": "natalia-sombra",
        "stage_name": "Natalia Sombra",
        "bio": "Cinemática. Cada foto mía podría ser un frame de una película. Drama, emoción y cuerpo.",
        "style": "cinematic, film noir, dramatic",
        "skin_tone": "medium/caramel skin",
        "body_type": "hourglass, feminine",
        "hair": "dark wavy hair",
        "setting": "moody hotel room, neon accent, cinematic grain",
        "categories": ["topless", "cuerpo"],
    },
]

# ── Photo Pose Templates ─────────────────────────────────────────────────────

POSES_LENCERIA = [
    "standing with back arched, hands on hips, wearing {lingerie_type}",
    "lying on side on {surface}, one leg bent, wearing {lingerie_type}",
    "kneeling on bed, hands behind back, wearing {lingerie_type}",
    "sitting on edge of bed, legs crossed, wearing {lingerie_type}",
    "standing facing away, looking over shoulder (no face), wearing {lingerie_type}",
    "leaning against wall, one arm up, wearing {lingerie_type}",
]

POSES_TOPLESS = [
    "hands covering chest, standing straight, confident pose",
    "arms crossed over chest, slightly turned to side",
    "hands holding chest from below, head tilted back (chin only visible)",
    "one arm across chest, other hand on hip, three-quarter turn",
    "lying face down on bed, back visible, looking away",
    "sitting with knees up, arms wrapped around legs covering chest",
]

POSES_CUERPO = [
    "full body standing in {outfit}, hands at sides, strong pose",
    "sitting cross-legged on floor, wearing {outfit}",
    "lying on back, one knee up, wearing {outfit}",
    "standing in doorway, leaning on frame, wearing {outfit}",
    "from behind, walking away, wearing {outfit}",
    "side profile silhouette, wearing {outfit}",
]

POSES_VIDEO = [
    "slowly walking towards camera, stops and poses with hand on hip",
    "sitting on bed, slowly shifting positions from sitting to lying on side",
    "standing, slowly turning 360 degrees with hands running through hair",
    "kneeling on bed, arching back slowly then returning to upright",
    "lying on stomach, slowly lifting upper body into cobra pose",
    "standing against wall, sliding down slowly into sitting position",
    "on all fours on bed, arching back and shifting weight side to side",
    "sitting on chair, slowly crossing and uncrossing legs",
    "standing in mirror reflection, posing with different arm positions",
    "lying on back, slowly bringing knees up and to the side",
]

LINGERIE_TYPES = [
    "black lace lingerie set",
    "red satin bra and thong",
    "white sheer bodysuit",
    "dark burgundy corset set",
    "black mesh two-piece",
    "leopard print bikini",
]

OUTFITS_BODY = [
    "oversized white shirt barely buttoned",
    "black bodycon dress",
    "high-waisted jeans and lace bralette",
    "silk robe loosely open",
    "crop top and boy shorts",
    "form-fitting tank top and panties",
]

SURFACES = ["silk sheets", "white bed", "velvet couch", "fur throw", "satin pillows"]


# ── Prompt Generator ──────────────────────────────────────────────────────────

def build_image_prompt(artist, pose, category):
    """Build a Grok image generation prompt for a specific artist + pose."""

    base = (
        f"Professional photography, {artist['style']}. "
        f"Woman with {artist['skin_tone']}, {artist['body_type']} body, {artist['hair']}. "
        f"Setting: {artist['setting']}. "
        f"Pose: {pose}. "
        f"IMPORTANT: Image is from NECK DOWN ONLY — absolutely NO face visible, "
        f"no chin, no eyes, no mouth. Camera is aimed at the body only. "
        f"High quality, 4K, professional studio lighting, tasteful and artistic. "
        f"NOT explicit, NOT pornographic — sensual and elegant."
    )

    return base


def build_video_prompt(artist, action):
    """Build a Grok video generation prompt."""

    base = (
        f"Short 10-second video clip, {artist['style']}. "
        f"Woman with {artist['skin_tone']}, {artist['body_type']} body, {artist['hair']}. "
        f"Setting: {artist['setting']}. "
        f"Action: {action}. "
        f"IMPORTANT: Camera is aimed NECK DOWN ONLY — absolutely NO face visible at any point. "
        f"Slow, smooth camera movement. Cinematic quality. "
        f"Sensual and artistic, NOT explicit. Professional production quality."
    )

    return base


def generate_all_prompts():
    """Generate the complete prompt library for all artists."""

    output = {"generated_at": datetime.now().isoformat(), "artists": []}

    for artist in ARTISTS:
        artist_data = {
            "id": artist["id"],
            "stage_name": artist["stage_name"],
            "bio": artist["bio"],
            "categories": artist["categories"],
            "photo_prompts": [],
            "video_prompts": [],
        }

        # Generate photo prompts based on artist categories
        if "lenceria" in artist["categories"]:
            for i, pose_template in enumerate(POSES_LENCERIA[:4]):  # 4 lenceria shots
                pose = pose_template.format(
                    lingerie_type=LINGERIE_TYPES[i % len(LINGERIE_TYPES)],
                    surface=SURFACES[i % len(SURFACES)],
                )
                prompt = build_image_prompt(artist, pose, "lenceria")
                artist_data["photo_prompts"].append({
                    "id": f"{artist['id']}-lenceria-{i+1}",
                    "category": "lenceria",
                    "pose": pose,
                    "prompt": prompt,
                })

        if "topless" in artist["categories"]:
            for i, pose in enumerate(POSES_TOPLESS[:4]):  # 4 topless shots
                prompt = build_image_prompt(artist, pose, "topless")
                artist_data["photo_prompts"].append({
                    "id": f"{artist['id']}-topless-{i+1}",
                    "category": "topless",
                    "pose": pose,
                    "prompt": prompt,
                })

        if "cuerpo" in artist["categories"]:
            for i, pose_template in enumerate(POSES_CUERPO[:4]):  # 4 body shots
                pose = pose_template.format(
                    outfit=OUTFITS_BODY[i % len(OUTFITS_BODY)]
                )
                prompt = build_image_prompt(artist, pose, "cuerpo")
                artist_data["photo_prompts"].append({
                    "id": f"{artist['id']}-cuerpo-{i+1}",
                    "category": "cuerpo",
                    "pose": pose,
                    "prompt": prompt,
                })

        # Generate video prompts — 3 per artist
        if "video" in artist["categories"]:
            video_poses = POSES_VIDEO[:5]  # 5 video prompts for video artists
        else:
            video_poses = POSES_VIDEO[:2]  # 2 video prompts for non-video artists

        for i, action in enumerate(video_poses):
            prompt = build_video_prompt(artist, action)
            artist_data["video_prompts"].append({
                "id": f"{artist['id']}-video-{i+1}",
                "action": action,
                "prompt": prompt,
            })

        output["artists"].append(artist_data)

    return output


# ── Grok API Integration ─────────────────────────────────────────────────────

GROK_API_BASE = "https://api.x.ai/v1"


def grok_generate_image(prompt, output_path, api_key):
    """Call Grok API to generate an image."""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "grok-2-image",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1536",  # Portrait orientation for body shots
        "response_format": "url",
    }

    try:
        resp = requests.post(
            f"{GROK_API_BASE}/images/generations",
            headers=headers,
            json=payload,
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()

        image_url = data["data"][0]["url"]

        # Download the image
        img_resp = requests.get(image_url, timeout=60)
        img_resp.raise_for_status()

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(img_resp.content)

        print(f"  ✓ Saved: {output_path}")
        return True

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


def grok_generate_video(prompt, output_path, api_key):
    """Call Grok API to generate a video."""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "grok-3-video",
        "prompt": prompt,
        "duration": 10,
    }

    try:
        resp = requests.post(
            f"{GROK_API_BASE}/video/generations",
            headers=headers,
            json=payload,
            timeout=300,
        )
        resp.raise_for_status()
        data = resp.json()

        video_url = data["data"][0]["url"]

        vid_resp = requests.get(video_url, timeout=120)
        vid_resp.raise_for_status()

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(vid_resp.content)

        print(f"  ✓ Saved: {output_path}")
        return True

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False


# ── Main Pipeline ─────────────────────────────────────────────────────────────

def main():
    output_dir = Path("./generated-content")
    prompts_file = output_dir / "prompts.json"

    if len(sys.argv) < 2:
        print("Encanta AI Artist Pipeline")
        print("=" * 40)
        print()
        print("Usage:")
        print("  python ai-artist-pipeline.py --generate-prompts")
        print("  python ai-artist-pipeline.py --generate-images")
        print("  python ai-artist-pipeline.py --generate-videos")
        print("  python ai-artist-pipeline.py --generate-all")
        print("  python ai-artist-pipeline.py --stats")
        print()
        print(f"Artists: {len(ARTISTS)}")
        print(f"Output dir: {output_dir}")
        return

    command = sys.argv[1]

    if command == "--generate-prompts":
        print("Generating prompt library...")
        prompts = generate_all_prompts()

        output_dir.mkdir(parents=True, exist_ok=True)
        with open(prompts_file, "w", encoding="utf-8") as f:
            json.dump(prompts, f, indent=2, ensure_ascii=False)

        total_photos = sum(len(a["photo_prompts"]) for a in prompts["artists"])
        total_videos = sum(len(a["video_prompts"]) for a in prompts["artists"])

        print(f"\n✓ Generated {total_photos} photo prompts + {total_videos} video prompts")
        print(f"✓ Saved to {prompts_file}")

        # Print summary
        print(f"\n{'Artist':<20} {'Photos':<10} {'Videos':<10}")
        print("-" * 40)
        for a in prompts["artists"]:
            print(f"{a['stage_name']:<20} {len(a['photo_prompts']):<10} {len(a['video_prompts']):<10}")

    elif command == "--generate-images":
        api_key = os.environ.get("GROK_API_KEY")
        if not api_key:
            print("Error: Set GROK_API_KEY environment variable")
            return

        if not prompts_file.exists():
            print("Error: Run --generate-prompts first")
            return

        with open(prompts_file, "r") as f:
            prompts = json.load(f)

        print("Generating images via Grok API...")
        total = 0
        success = 0

        for artist in prompts["artists"]:
            artist_dir = output_dir / artist["id"] / "photos"
            print(f"\n◆ {artist['stage_name']}")

            for photo in artist["photo_prompts"]:
                total += 1
                out_path = artist_dir / f"{photo['id']}.png"

                if out_path.exists():
                    print(f"  → Skip (exists): {photo['id']}")
                    success += 1
                    continue

                ok = grok_generate_image(photo["prompt"], str(out_path), api_key)
                if ok:
                    success += 1
                time.sleep(2)  # Rate limiting

        print(f"\n✓ Generated {success}/{total} images")

    elif command == "--generate-videos":
        api_key = os.environ.get("GROK_API_KEY")
        if not api_key:
            print("Error: Set GROK_API_KEY environment variable")
            return

        if not prompts_file.exists():
            print("Error: Run --generate-prompts first")
            return

        with open(prompts_file, "r") as f:
            prompts = json.load(f)

        print("Generating videos via Grok API...")
        total = 0
        success = 0

        for artist in prompts["artists"]:
            artist_dir = output_dir / artist["id"] / "videos"
            print(f"\n◆ {artist['stage_name']}")

            for video in artist["video_prompts"]:
                total += 1
                out_path = artist_dir / f"{video['id']}.mp4"

                if out_path.exists():
                    print(f"  → Skip (exists): {video['id']}")
                    success += 1
                    continue

                ok = grok_generate_video(video["prompt"], str(out_path), api_key)
                if ok:
                    success += 1
                time.sleep(5)  # Videos take longer, more rate limiting

        print(f"\n✓ Generated {success}/{total} videos")

    elif command == "--generate-all":
        # Run all steps
        print("=" * 50)
        print("ENCANTA AI CONTENT PIPELINE — FULL RUN")
        print("=" * 50)

        # Step 1: Prompts
        sys.argv[1] = "--generate-prompts"
        main()

        # Step 2: Images
        sys.argv[1] = "--generate-images"
        main()

        # Step 3: Videos
        sys.argv[1] = "--generate-videos"
        main()

    elif command == "--stats":
        if not prompts_file.exists():
            print("No prompts generated yet. Run --generate-prompts first.")
            return

        with open(prompts_file, "r") as f:
            prompts = json.load(f)

        total_photos = sum(len(a["photo_prompts"]) for a in prompts["artists"])
        total_videos = sum(len(a["video_prompts"]) for a in prompts["artists"])

        print(f"Encanta AI Pipeline Stats")
        print(f"=" * 40)
        print(f"Artists:       {len(prompts['artists'])}")
        print(f"Photo prompts: {total_photos}")
        print(f"Video prompts: {total_videos}")
        print(f"Total content: {total_photos + total_videos}")
        print()

        # Check what's been generated
        generated_photos = 0
        generated_videos = 0
        for a in prompts["artists"]:
            photo_dir = output_dir / a["id"] / "photos"
            video_dir = output_dir / a["id"] / "videos"
            if photo_dir.exists():
                generated_photos += len(list(photo_dir.glob("*.png")))
            if video_dir.exists():
                generated_videos += len(list(video_dir.glob("*.mp4")))

        print(f"Generated photos: {generated_photos}/{total_photos}")
        print(f"Generated videos: {generated_videos}/{total_videos}")

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
