"""Bibliothèque de bruitages synthétisés (whoosh, impacts, clics, UI, lumière...).

Chaque générateur renvoie un signal mono numpy à 48 kHz. Les scènes déclarent des événements
{t, type, gain, ...paramètres} que mix.py place sur la piste.
"""
import numpy as np
from scipy import signal

from musiclib import SR, bp, hp, lp, noise

rng = np.random.default_rng(7)


def _t(d):
    return np.arange(int(d * SR)) / SR


def env_ar(n, attack, release_curve=4.0):
    t = np.linspace(0, 1, n, endpoint=False)
    a = max(attack, 1e-4)
    up = np.clip(t / a, 0, 1) ** 1.5
    down = np.exp(-release_curve * np.clip((t - a) / (1 - a + 1e-9), 0, 1))
    return up * down


def bandsweep(x, f0, f1, q=1.4):
    out = np.zeros_like(x)
    block = 256
    nb = int(np.ceil(len(x) / block))
    zi = None
    for i in range(nb):
        fc = f0 * (f1 / f0) ** (i / max(nb - 1, 1))
        bw = fc / q
        lo = max(30, fc - bw / 2) / (SR / 2)
        hi = min(SR / 2 - 100, fc + bw / 2) / (SR / 2)
        sos = signal.butter(2, [lo, hi], btype="band", output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg = x[i * block:(i + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[i * block:i * block + len(seg)] = y
    return out


# ------------------------------------------------------------ mouvements
def whoosh(dur=0.4, f0=500, f1=2000, **_):
    n = int(dur * SR)
    x = bandsweep(rng.standard_normal(n), f0, f1)
    t = np.linspace(0, 1, n)
    # couche "air" grave + couche brillante
    x += 0.5 * bandsweep(rng.standard_normal(n), f0 * 0.4, f1 * 0.4, q=0.9)
    e = np.sin(np.pi * t ** 0.75) ** 2
    return x * e * 2.0


def swish(dur=0.25, **_):
    """whoosh court et brillant (texte, UI)."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = bandsweep(rng.standard_normal(n), 2500, 7000, q=1.2)
    return x * np.sin(np.pi * t ** 0.6) ** 2 * 1.6


def flutter(dur=0.6, rate=14, **_):
    """objet qui tournoie dans l'air (whoosh modulé)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 600, 3500)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * rate * t) ** 2
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return x * am * e * 1.4


def suck(dur=0.33, **_):
    n = int((dur + 0.05) * SR)
    t = np.linspace(0, 1, n)
    x = bandsweep(rng.standard_normal(n), 400, 5000, q=2.0)
    return x * t ** 2.2 * 2.6


def doppler(dur=0.5, f=180, **_):
    """passage rapide d'un moteur (hauteur qui chute)."""
    t = _t(dur)
    ff = f * (1.25 - 0.5 * np.clip(t / dur, 0, 1))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 8))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return lp(x, 2500) * e * 0.5


# ------------------------------------------------------------ impacts
def thud(**_):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = lp(rng.standard_normal(n), 900) * np.exp(-t * 90)
    return body * 0.9 + click * 0.5


def boom(**_):
    t = _t(2.0)
    b = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t * 16)) / SR) * np.exp(-t * 2.4)
    n = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 14) * 0.5
    return np.tanh(1.6 * (b + n))


def tick(f=2300, **_):
    t = _t(0.08)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 90) * 0.6


def clack(**_):
    t = _t(0.3)
    n = len(t)
    hi = bp(rng.standard_normal(n), 1800, 6000) * np.exp(-t * 70)
    ring = (np.sin(2 * np.pi * 1450 * t) + 0.5 * np.sin(2 * np.pi * 2870 * t)) * np.exp(-t * 35) * 0.35
    knock = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * 0.7
    return hi * 0.9 + ring + knock


def pop(f0=400, f1=900, **_):
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / 0.06, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.03, 7)


def click(**_):
    """clic de souris / bouton."""
    t = _t(0.05)
    x = bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t * 400)
    x += np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 250) * 0.4
    return x


def key(**_):
    """frappe de clavier."""
    t = _t(0.06)
    x = bp(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 260) * 0.7
    x += np.sin(2 * np.pi * rng.uniform(900, 1300) * t) * np.exp(-t * 300) * 0.3
    return x


# ------------------------------------------------------------ lumière / magie / UI
def light_on(**_):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    bm = np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 18)) / SR) * np.exp(-t * 3.2) * 0.9
    burst = hp(rng.standard_normal(n), 3000) * np.exp(-t * 6) * 0.35
    shimmer = np.zeros(n)
    for f, a in [(659.25, 1), (987.77, 0.7), (1318.5, 0.5), (1975.5, 0.25)]:
        shimmer += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    shimmer *= np.clip(t / 0.02, 0, 1) * np.exp(-t * 1.6) * 0.16
    return bm + burst + shimmer


def grow(**_):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 300 * (1400 / 300) ** np.clip(t / 0.35, 0, 1)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.15, 5) * 0.5
    sparkle = sum(np.sin(2 * np.pi * fr * t) * np.exp(-np.clip(t - d, 0, None) * 18) * (t > d)
                  for fr, d in [(2637, 0.18), (3136, 0.26), (3951, 0.33)]) * 0.12
    return tone + sparkle


def sparkle(**_):
    t = _t(0.9)
    x = np.zeros(len(t))
    for i, f in enumerate([2093, 2637, 3136, 3951, 4699]):
        d = i * 0.045
        x += np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - d, 0, None) * 9) * (t > d)
    return x * 0.18 + hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * 12) * 0.08


def chime(**_):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for i, (f, a) in enumerate([(523.25, 1), (659.25, 0.8), (783.99, 0.7), (1046.5, 0.45)]):
        d = i * 0.055
        tt = np.clip(t - d, 0, None)
        partials = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 6)
        out += a * partials * np.exp(-tt * 2.2) * (t >= d)
    return out * 0.22


def beep(f=1800, n=2, gap=0.07, **_):
    """bip(s) numériques (scan / donnée enregistrée)."""
    t = _t(0.05)
    one = signal.square(2 * np.pi * f * t, 0.5) * np.exp(-t * 30) * np.clip(t / 0.002, 0, 1)
    one = lp(one, 6000) * 0.35
    out = np.zeros(int((n * gap + 0.06) * SR))
    for k in range(n):
        i = int(k * gap * SR)
        out[i:i + len(one)] += one * (1 if k == n - 1 else 0.8)
    return out


def ui_pop(f=880, **_):
    """apparition d'élément d'interface (bulle)."""
    t = _t(0.18)
    ff = f * (1 + 0.6 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 28) * np.clip(t / 0.003, 0, 1) * 0.6


def notif(**_):
    """notification (deux notes)."""
    t = _t(0.5)
    a = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 10) * (t < 0.5)
    t2 = np.clip(t - 0.09, 0, None)
    b = np.sin(2 * np.pi * 1975.5 * t2) * np.exp(-t2 * 8) * (t > 0.09)
    return (a + b) * 0.35


def glitch(dur=0.35, **_):
    n = int(dur * SR)
    x = np.zeros(n)
    i = 0
    while i < n:
        L = int(rng.uniform(0.008, 0.04) * SR)
        kind = rng.integers(0, 3)
        tt = np.arange(min(L, n - i)) / SR
        if kind == 0:
            seg = signal.square(2 * np.pi * rng.uniform(200, 3000) * tt) * 0.4
        elif kind == 1:
            seg = rng.standard_normal(len(tt)) * 0.5
        else:
            seg = np.zeros(len(tt))
        x[i:i + len(tt)] = seg
        i += L
    return bp(x, 300, 9000) * 0.9


def typing(dur=1.0, rate=11, **_):
    out = np.zeros(int((dur + 0.1) * SR))
    k = 0.0
    while k < dur:
        i = int(k * SR)
        s = key()
        out[i:i + len(s)] += s * rng.uniform(0.6, 1)
        k += rng.uniform(0.6, 1.4) / rate
    return out


def cash(**_):
    """paiement validé."""
    t = _t(0.9)
    x = np.zeros(len(t))
    for d, f in [(0, 2093), (0.06, 2637), (0.12, 3136)]:
        tt = np.clip(t - d, 0, None)
        x += (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 7) * (t >= d)
    x *= 0.22
    c = click()
    x[: len(c)] += c * 0.5
    return x


GEN = {k: v for k, v in globals().items() if callable(v) and not k.startswith("_")
       and k not in ("env_ar", "bandsweep", "bp", "hp", "lp", "noise", "signal")}
GEN["lightOn"] = light_on


def spinup(dur=0.45, **_):
    """moteurs qui démarrent (sifflement montant)."""
    t = _t(dur)
    f = 140 * (5.5 ** np.clip(t / dur, 0, 1) ** 0.7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * 0.4 + np.sin(2 * ph) * 0.3
    e = np.clip(t / 0.05, 0, 1) * (1 - np.clip((t - dur * 0.7) / (dur * 0.3), 0, 1))
    return lp(x, 3500) * e


GEN["spinup"] = spinup
