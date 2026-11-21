import sys, subprocess, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = "/tmp/claude-0/-home-user-Weddingv2/84a6d863-f7e1-5062-a940-bf44b793da53/scratchpad"
FD = "/home/user/Weddingv2/src/imports/fonts/"
OUT = sys.argv[1]; AUDIO = sys.argv[2]
PREVIEW = len(sys.argv) > 3
W, H, FPS, DUR = 1080, 1920, 30, 20.0
GOLD = (138, 112, 48); INK = (42, 26, 10); BROWN = (110, 84, 52)

def en(w, size):
    return ImageFont.truetype(FD + f"TTInterphasesPro-{w}.ttf", size, layout_engine=ImageFont.Layout.RAQM)
def th(size, wght=400):
    f = ImageFont.truetype(S + "/NotoSansThai.ttf", size, layout_engine=ImageFont.Layout.RAQM)
    f.set_variation_by_axes([wght]); return f

# background gradient (site page ramp)
g = np.linspace(0, 1, H)[:, None]
stops = [(0, (248, 241, 230)), (.55, (242, 232, 210)), (1, (227, 210, 176))]
bg = np.zeros((H, W, 3))
for c in range(3):
    bg[:, :, c] = np.interp(g, [s[0] for s in stops], [s[1][c] for s in stops])
# soft vignette
yy, xx = np.mgrid[0:H, 0:W]
v = ((xx - W/2)/(W*0.8))**2 + ((yy - H*0.45)/(H*0.75))**2
bg *= (1 - 0.10*np.clip(v, 0, 1))[:, :, None]
BG = Image.fromarray(bg.astype(np.uint8)).convert("RGBA")

PHOTO = Image.open("/home/user/Weddingv2/story/venue_house.webp").convert("RGB")
PH = 920
m = np.clip((np.arange(PH) - 640)/(PH - 640), 0, 1); m = 1 - m*m*(3 - 2*m)
PMASK = Image.fromarray((np.repeat(m[:, None], W, 1)*255).astype(np.uint8))
def photo_at(t):
    z = 1 + 0.08*(t/DUR)
    bh = PHOTO.height/z; bw = bh*W/PH; cx = 1060 - 40*(t/DUR); cy = bh/2 + (PHOTO.height - bh)*0.3
    box = (cx - bw/2, cy - bh/2, cx + bw/2, cy + bh/2)
    return PHOTO.resize((W, PH), Image.BICUBIC, box=box)
logo = Image.open(S + "/logo.png")
LW = 190; logo = logo.resize((LW, round(logo.height*LW/logo.width)), Image.LANCZOS)

def text_layer(txt, font, fill, tracking=0.0):
    # render (optionally letter-spaced) text to its own RGBA image
    if tracking == 0:
        l, t, r, b = font.getbbox(txt)
        im = Image.new("RGBA", (r - l + 4, b - t + 4), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((2 - l, 2 - t), txt, font=font, fill=fill)
        return im
    sp = font.size * tracking
    widths = [font.getlength(ch) for ch in txt]
    total = sum(widths) + sp*(len(txt) - 1)
    asc, desc = font.getmetrics()
    im = Image.new("RGBA", (int(total) + 4, asc + desc + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); x = 2
    for ch, w in zip(txt, widths):
        d.text((x, 2), ch, font=font, fill=fill); x += w + sp
    return im.crop(im.getbbox())

def ease(t): return 1 - (1 - t)**3
def prog(t, start, dur): return ease(min(max((t - start)/dur, 0), 1))

L = {
  "day":  text_layer("DAY TO GO", en("Medium", 46), INK, 0.38),
  "th":   text_layer("อีกเพียงหนึ่งวันเท่านั้น", th(50, 450), BROWN),
  "date": text_layer("SUNDAY  ·  22 . 11 . 2026", en("Regular", 36), INK, 0.22),
  "ven":  text_layer("SailomSangdad Homey Studio", en("LightItalic", 38), BROWN),
  "see":  text_layer("See you tomorrow", en("Italic", 54), GOLD),
  "seeth":text_layer("แล้วพบกันพรุ่งนี้นะ", th(40, 400), BROWN),
}
NUMF = en("Light", 320)
num_cache = {}
def num_layer(n):
    if n not in num_cache: num_cache[n] = text_layer(str(n), NUMF, GOLD)
    return num_cache[n]

random.seed(7)
dots = [dict(x=random.uniform(0, W), y=random.uniform(0, H), r=random.uniform(2, 5.5),
             vy=random.uniform(12, 34), ph=random.uniform(0, 6.28), a=random.uniform(.25, .6))
        for _ in range(46)]

def put(frame, im, cx, cy, p, rise=28):
    if p <= 0: return
    if p < 1:
        im = im.copy(); a = im.getchannel("A").point(lambda v: int(v*p)); im.putalpha(a)
    frame.alpha_composite(im, (int(cx - im.width/2), int(cy - im.height/2 + (1 - p)*rise)))

def frame_at(t):
    f = BG.copy()
    ph = photo_at(t).convert("RGBA"); ph.putalpha(PMASK.point(lambda v: int(v*min(t/1.0, 1))))
    f.alpha_composite(ph)
    dl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(dl)
    fade_in = min(t/1.0, 1)
    for o in dots:
        y = (o["y"] - o["vy"]*t) % H; x = o["x"] + 14*math.sin(t*0.7 + o["ph"])
        a = int(255*o["a"]*fade_in*(0.6 + 0.4*math.sin(t*1.3 + o["ph"])))
        if y < 800: continue
        d.ellipse((x - o["r"], y - o["r"], x + o["r"], y + o["r"]), fill=GOLD + (a,))
    f.alpha_composite(dl.filter(ImageFilter.GaussianBlur(1.2)))

    put(f, logo, W/2, 975, prog(t, 0.2, 1.4), 36)
    # rolling countdown 30 -> 1, lands at ~3.4s
    rp = prog(t, 1.4, 2.0)
    if t >= 1.4:
        n = max(1, round(30 - 29*rp))
        pulse = 1 + 0.015*math.sin(max(t - 3.4, 0)*2*math.pi/1.96) if t > 3.4 else 1
        im = num_layer(n)
        if pulse != 1: im = im.resize((int(im.width*pulse), int(im.height*pulse)), Image.LANCZOS)
        put(f, im, W/2, 1185, prog(t, 1.4, 0.6), 0)
    put(f, L["day"], W/2, 1335, prog(t, 3.4, 1.0))
    put(f, L["th"], W/2, 1400, prog(t, 4.2, 1.0))
    lp = prog(t, 5.2, 1.0)
    if lp > 0:
        ln = ImageDraw.Draw(f); half = 70*lp
        ln.line((W/2 - half, 1465, W/2 + half, 1465), fill=GOLD + (255,), width=2)
        ln.ellipse((W/2 - 5, 1460, W/2 + 5, 1470), fill=GOLD + (int(255*lp),))
    put(f, L["date"], W/2, 1520, prog(t, 5.9, 1.0))
    put(f, L["ven"], W/2, 1570, prog(t, 6.6, 1.0))
    put(f, L["see"], W/2, 1645, prog(t, 11.5, 1.4))
    put(f, L["seeth"], W/2, 1700, prog(t, 12.3, 1.4))
    end = min(max((t - (DUR - 1.2))/1.2, 0), 1)
    if end > 0:
        f = Image.blend(f, BG, end*0.85)
    return f.convert("RGB")

if PREVIEW:
    for t in map(float, sys.argv[3].split(",")):
        frame_at(t).save(f"{S}/prev_{t:05.1f}.png")
    sys.exit()

ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
    "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", AUDIO, "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
for i in range(int(DUR*FPS)):
    ff.stdin.write(frame_at(i/FPS).tobytes())
ff.stdin.close(); ff.wait()
