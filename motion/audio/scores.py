"""Compositions (une par vidéo). Chaque fonction reçoit la timeline T de la scène (secondes)
et renvoie un signal stéréo. Les temps forts musicaux sont calés sur les moments clés de l'image.
"""
import numpy as np

import musiclib as M
from musiclib import Song, m


def _afro_kit(s):
    s.track("kick", gain=0.78)
    s.track("clap", gain=0.42, reverb=0.25)
    s.track("hat", gain=0.28, pan=0.25)
    s.track("shaker", gain=0.34, pan=-0.3)
    s.track("perc", gain=0.32, pan=0.35, reverb=0.15)
    s.track("conga", gain=0.34, pan=-0.2, reverb=0.12)
    s.track("log", gain=0.4, duck=0.35)
    s.track("keys", gain=0.55, pan=-0.1, reverb=0.3, delay=0.12, duck=0.4)
    s.track("pad", gain=0.13, reverb=0.4, duck=0.5)
    s.track("kal", gain=0.5, pan=0.2, reverb=0.35, delay=0.25)
    s.track("fx", gain=0.5, reverb=0.3)


def _shaker_bar(s, bar, gain=1.0, beats=4):
    acc = [1.0, 0.45, 0.75, 0.5]
    for i in range(int(beats * 4)):
        s.hit("shaker", bar * 4 + i * 0.25, M.shaker(bright=1.0 if i % 4 else 1.1), gain * acc[i % 4])


def _groove_bar(s, bar, chords, kick=True, clap=True, extra=True):
    b0 = bar * 4
    if kick:
        for k in range(4):
            s.kick_at(b0 + k, M.kick())
    if clap:
        for k in (1, 3):
            s.hit("clap", b0 + k, M.clap())
    for k in range(4):
        s.hit("hat", b0 + k + 0.5, M.hat(open_=True, dur=0.25), 0.9)
    _shaker_bar(s, bar)
    if extra:
        for p in (0.75, 1.75, 2.5, 3.25):
            s.hit("perc", b0 + p, M.rim(), 0.8)
        for p, f in ((0.5, 260), (1.25, 200), (2.75, 260), (3.5, 200), (3.75, 180)):
            s.hit("conga", b0 + p, M.conga(f), 0.9)
    # log drum syncopé (amapiano) + accords de piano électrique en contretemps
    for (cb, bass, voicing) in chords:
        cb_abs = b0 + cb
        for off, octv, g in ((0, 0, 1.0), (0.75, 0, 0.8), (1.5, 12, 0.7)):
            if off < 2:
                s.hit("log", cb_abs + off, M.log_drum(m(bass) + octv, dur=0.42), g)
        for off in (0.5, 1.5):
            s.hit("keys", cb_abs + off, M.epiano(voicing, dur=0.22, vel=0.75))
        s.hit("pad", cb_abs, M.pad(voicing, dur=2 * s.beat, cutoff=1400))


def score_drone(T, duration):
    """Afro-house 122 BPM. Mesure 1 (le drop) = allumage de la lumière."""
    bpm = 122
    beat = 60 / bpm
    s = Song(duration + 0.3, bpm, t0=T["beamOn"] - 4 * beat, swing=0.12)
    _afro_kit(s)
    Am9 = M.chord("C4", "E4", "G4", "B4")
    F9 = M.chord("A3", "C4", "E4", "G4")
    C7 = M.chord("B3", "E4", "G4", "C5")
    G6 = M.chord("B3", "D4", "E4", "G4")
    Cadd9 = M.chord("E4", "G4", "B4", "D5")

    # mesure 0 : intro (assemblage du drone) - shaker, kalimba, nappe filtrée, montée
    _shaker_bar(s, 0, gain=0.6)
    for p, f in ((0.5, 260), (1.5, 200), (2.5, 260), (3.25, 200), (3.5, 180), (3.75, 160)):
        s.hit("conga", p, M.conga(f), 0.7)
    for p, n in ((0, "A4"), (0.75, "C5"), (1.5, "E5"), (2.0, "G5"), (3.0, "A5")):
        s.hit("kal", p, M.kalimba(n), 0.9)
    s.hit("pad", 0, M.pad(Am9, dur=4 * beat, cutoff=700, attack=0.8))
    s.at("fx", s.bt(1.5), M.riser(dur=2.5 * beat), 0.7)
    s.at("fx", s.bt(3), M.reverse_cymbal(dur=beat), 0.9)

    # mesures 1-2 : drop (orbite du drone)
    _groove_bar(s, 1, [(0, "A1", Am9), (2, "F1", F9)])
    _groove_bar(s, 2, [(0, "C2", C7), (2, "G1", G6)])
    s.hit("fx", 4, M.crash(), 0.8)
    s.hit("fx", 4, M.impact(dur=1.5), 0.5)
    hook = [(0, "E5"), (0.75, "G5"), (1, "A5"), (1.5, "G5"), (2, "E5"), (2.5, "D5"), (3, "E5"), (3.5, "C5"),
            (4, "E5"), (4.75, "G5"), (5, "A5"), (5.5, "C6"), (6, "B5"), (6.5, "A5"), (7, "G5"), (7.5, "E5")]
    for p, n in hook:
        s.hit("kal", 4 + p, M.kalimba(n), 0.85)

    # mesure 3 : le volet sombre ; break puis montée vers la carte de fin
    b3 = 12
    for k in range(2):
        s.kick_at(b3 + k, M.kick())
    s.hit("clap", b3 + 1, M.clap())
    _shaker_bar(s, 3, gain=0.8)
    for off, n in ((0, "A1"), (0.75, "A1"), (1.5, "F1")):
        s.hit("log", b3 + off, M.log_drum(m(n), dur=0.45))
    s.hit("keys", b3 + 0.5, M.epiano(Am9, dur=0.3))
    s.hit("keys", b3 + 1.5, M.epiano(F9, dur=0.3))
    s.hit("pad", b3, M.pad(F9, dur=4 * beat, cutoff=1800))
    for i in range(8):  # roulement de clap qui accélère
        s.hit("clap", b3 + 2 + i * 0.25, M.clap(dur=0.15), 0.35 + 0.08 * i)
    s.at("fx", s.bt(b3 + 0.5), M.riser(dur=3.5 * beat), 0.8)
    s.at("fx", s.bt(b3 + 3), M.reverse_cymbal(dur=beat), 1.0)

    # mesure 4 : carte de fin - accord résolu en majeur, kalimba qui monte
    b4 = 16
    s.kick_at(b4, M.kick(decay=4))
    s.hit("fx", b4, M.crash(dur=2.5), 0.9)
    s.hit("fx", b4, M.impact(), 0.6)
    s.hit("log", b4, M.log_drum(m("C2"), dur=1.4, decay=2.2), 1.0)
    s.hit("keys", b4, M.epiano(Cadd9, dur=1.6, vel=0.85))
    s.hit("pad", b4, M.pad(Cadd9, dur=1.6, cutoff=2200, release=1.0))
    for i, n in enumerate(("E5", "G5", "B5", "D6", "E6", "G6")):
        s.hit("kal", b4 + 0.5 + i * 0.25, M.kalimba(n, vel=0.75 - i * 0.06))
    _shaker_bar(s, 4, gain=0.5, beats=2)
    return s.render()


SCORES = {"drone": score_drone}


def score_studio(T, duration):
    """Électro sombre 120 BPM (ré mineur) avec une touche afro ; break pendant la recherche, accord final sur le logo."""
    bpm = 120
    beat = 60 / bpm
    s = Song(duration + 0.3, bpm, t0=0.0, swing=0.06)
    s.track("kick", gain=0.85)
    s.track("clap", gain=0.4, reverb=0.25)
    s.track("hat", gain=0.24, pan=0.3)
    s.track("shaker", gain=0.26, pan=-0.35)
    s.track("conga", gain=0.28, pan=-0.2, reverb=0.15)
    s.track("sub", gain=0.5, duck=0.6)
    s.track("arp", gain=0.3, pan=0.15, reverb=0.25, delay=0.3, duck=0.5)
    s.track("stab", gain=0.3, pan=-0.15, reverb=0.35, delay=0.15, duck=0.4)
    s.track("pad", gain=0.2, reverb=0.45, duck=0.4)
    s.track("bell", gain=0.32, reverb=0.5, delay=0.25)
    s.track("fx", gain=0.5, reverb=0.3)
    Dm9 = M.chord("D3", "F3", "A3", "C4", "E4")
    Bb9 = M.chord("Bb2", "D3", "F3", "A3", "C4")
    Gm9 = M.chord("G2", "Bb2", "D3", "F3", "A3")
    Asus = M.chord("A2", "D3", "E3", "G3", "C#4")
    F9 = M.chord("F3", "A3", "C4", "E4", "G4")
    prog_ = [(Dm9, "D1"), (Bb9, "Bb0"), (Gm9, "G0"), (Asus, "A0")]
    beats_total = int((duration + 0.3) / beat)
    b_drop = 8           # 4 s
    b_break = int(T["s6"] / beat)    # 18 s
    b_final = int(T["s7"] / beat)    # 21 s

    def chord_at(b):
        return prog_[(int(b // 4)) % 4]

    # nappe tout du long jusqu'au final (filtre qui s'ouvre pendant l'intro)
    for bar in range(0, b_final // 4 + 1):
        b0 = bar * 4
        if b0 >= b_final:
            break
        ch, _ = chord_at(b0)
        dur = min(4, b_final - b0) * beat
        cut = 500 + 1400 * min(1, bar / 2)
        s.hit("pad", b0, M.pad([n + 12 for n in ch], dur=dur, cutoff=cut, attack=0.4 if bar else 1.2), 0.9)
    # arpège (doubles-croches), plus discret pendant l'intro et le break
    for b in np.arange(0, b_final, 0.25):
        ch, _ = chord_at(b)
        idx = [0, 2, 4, 3, 1, 3, 2, 4][int(b * 4) % 8]
        note = ch[idx] + 12
        g = 0.45 if b < b_drop else (0.5 if b_break <= b < b_final else 0.85)
        if b < 2:
            continue
        s.hit("arp", b, M.pluck(note, dur=0.12, cutoff=1500 + 2500 * min(1, b / b_drop)), g)
    # montée vers le drop
    s.at("fx", s.bt(b_drop - 4), M.riser(dur=4 * beat), 0.6)
    s.at("fx", s.bt(b_drop - 2), M.reverse_cymbal(dur=2 * beat), 0.8)
    # rythmique principale
    for b in range(b_drop, b_break):
        bb = b % 4
        s.kick_at(b, M.kick(f_lo=44))
        if bb in (1, 3):
            s.hit("clap", b, M.clap())
        s.hit("hat", b + 0.5, M.hat(open_=b >= 16, dur=0.2 if b >= 16 else None), 0.9)
        if b >= 16:
            s.hit("hat", b + 0.25, M.hat(), 0.4)
            s.hit("hat", b + 0.75, M.hat(), 0.4)
        for k in range(4):
            s.hit("shaker", b + k * 0.25, M.shaker(), [1, 0.4, 0.7, 0.45][k])
        if b >= 16 and bb in (0, 2):
            s.hit("conga", b + 0.75, M.conga(240), 0.8)
            s.hit("conga", b + 1.5, M.conga(190), 0.7)
        _, root = chord_at(b)
        s.hit("sub", b + 0.5, M.sub(m(root) + 12, dur=0.22))
        if bb == 3:
            s.hit("sub", b + 0.75, M.sub(m(root) + 24, dur=0.12), 0.6)
        if b >= 16 and bb in (0, 2):
            ch, _ = chord_at(b)
            s.hit("stab", b + 0.5, M.pluck([n + 12 for n in ch][2], dur=0.18), 0.5)
            s.hit("stab", b + 0.5, M.epiano([n + 12 for n in ch][1:], dur=0.18, vel=0.7))
    for b in (16, 24):
        s.hit("fx", b, M.crash(), 0.7)
    # transition vers le mur 3D (12 s) et les tags (15 s)
    s.at("fx", T["s4Out"] - 0.4, M.riser(dur=1.0), 0.5)
    s.hit("fx", 30, M.crash(dur=1.6), 0.6)
    for k in range(4):  # roulement de toms avant les tags
        s.hit("conga", 28.5 + k * 0.25 + 0.5, M.tom(140 - k * 12), 0.6)
    # break pendant la recherche : pas de kick, nappe + arpège léger, montée vers le final
    s.at("fx", T["clickAt"] - 1.2, M.riser(dur=1.2 + (T["s7"] - T["clickAt"])), 0.8)
    s.at("fx", T["s7"] - 2 * beat, M.reverse_cymbal(dur=2 * beat), 1.0)
    # final : impact + accord lumineux
    t7 = T["s7"]
    s.kicks.append(t7)
    s.at("kick", t7, M.kick(decay=3.5), 1.0)
    s.at("fx", t7, M.impact(dur=3.0), 0.9)
    s.at("fx", t7, M.crash(dur=3.0), 0.9)
    s.at("sub", t7, M.sub("F1", dur=2.5, release=1.5), 1.0)
    s.at("pad", t7, M.pad([n + 12 for n in F9], dur=3.5, cutoff=2600, attack=0.05, release=1.5), 1.1)
    s.at("stab", t7, M.epiano(F9, dur=2.5, vel=0.9), 1.0)
    for i, n in enumerate(("F5", "A5", "C6", "E6", "G6")):
        s.at("bell", T["logo"] + 0.15 + i * 0.12, M.bell(n, dur=2.5, vel=0.7 - i * 0.08))
    s.at("bell", T["tag"], M.bell("C6", dur=2.0, vel=0.4))
    out = s.render()
    # hachage "glitch" de la musique au moment du glitch visuel
    i0, i1 = int(T["glitch"] * M.SR), int((T["glitch"] + 0.4) * M.SR)
    tt = np.arange(i1 - i0) / M.SR
    gate = (np.sin(2 * np.pi * 16 * tt) > -0.2).astype(float)
    out[i0:i1] *= gate[:, None] * 0.9 + 0.1
    return out


SCORES["studio"] = score_studio


def score_app(T, duration):
    """Amapiano 112 BPM (la mineur, ii-V-I-vi jazzy) : log drum, shakers, piano ; chaque écran = une mesure."""
    bpm = 112
    beat = 60 / bpm
    s = Song(duration + 0.3, bpm, t0=0.0, swing=0.14)
    _afro_kit(s)
    s.track("keys", gain=0.5, pan=-0.1, reverb=0.32, delay=0.14, duck=0.35)
    s.track("bell", gain=0.3, reverb=0.5, delay=0.2)
    Dm9 = M.chord("F3", "A3", "C4", "E4")
    G13 = M.chord("F3", "B3", "E4", "A4")
    Cmaj9 = M.chord("E3", "G3", "B3", "D4")
    Am9 = M.chord("C4", "E4", "G4", "B4")
    prog_ = [(Dm9, "D1"), (G13, "G1"), (Cmaj9, "C2"), (Am9, "A1")]
    n_bars = int(T["outro"] / (4 * beat))  # 10 mesures avant l'outro

    # mesure 0 : intro (logo lumineux) - piano seul + shaker filtré
    s.hit("keys", 0, M.epiano(Dm9, dur=2 * beat, vel=0.7))
    s.hit("keys", 2, M.epiano(G13, dur=2 * beat, vel=0.7))
    _shaker_bar(s, 0, gain=0.4)
    s.at("fx", 0.5, M.riser(dur=4 * beat - 0.5), 0.5)
    s.at("fx", s.bt(3), M.reverse_cymbal(dur=beat), 0.8)

    for bar in range(1, n_bars):
        b0 = bar * 4
        ch, root = prog_[bar % 4]
        # kick amapiano (1 et 3, + petit coup sur le "et" du 4)
        for p in (0, 2):
            s.kick_at(b0 + p, M.kick(f_lo=50, decay=8))
        s.kick_at(b0 + 3.5, M.kick(f_lo=50, decay=10), 0.5)
        s.hit("clap", b0 + 3, M.clap(tone=1800), 0.8)
        s.hit("perc", b0 + 1, M.rim(), 0.6)
        _shaker_bar(s, bar, gain=0.9)
        for k in range(4):
            s.hit("hat", b0 + k + 0.5, M.hat(), 0.6)
        # log drum : motif syncopé typique
        for off, oc, g in ((0, 0, 1.0), (0.75, 0, 0.75), (1.5, 12, 0.8), (2.5, 0, 0.9), (3.0, 7, 0.7), (3.5, 12, 0.6)):
            s.hit("log", b0 + off, M.log_drum(m(root) + 12 + oc, dur=0.38, glide=2.4), g)
        # piano : accords en contretemps, voicings jazzy
        for off in (0.5, 1.75, 2.5, 3.25):
            s.hit("keys", b0 + off, M.epiano(ch, dur=0.26, vel=0.7))
        s.hit("pad", b0, M.pad(ch, dur=4 * beat, cutoff=1500), 0.8)
        if bar >= 3:
            for p, f in ((0.75, 250), (1.25, 200), (2.75, 250), (3.75, 190)):
                s.hit("conga", b0 + p, M.conga(f), 0.8)
        # petite mélodie de kalimba toutes les deux mesures
        if bar % 2 == 0:
            for p, n in ((0, "E5"), (0.5, "G5"), (1, "A5"), (1.75, "C6"), (2.5, "B5"), (3, "A5")):
                s.hit("kal", b0 + p, M.kalimba(n, vel=0.6))
    # accents aux changements d'écran
    for bar in (1, 3, 5, 7, 9):
        s.hit("fx", bar * 4, M.crash(dur=1.4), 0.45)
    # montée vers l'outro
    bo = n_bars * 4
    s.at("fx", s.bt(bo - 4), M.riser(dur=4 * beat), 0.7)
    s.at("fx", s.bt(bo - 1), M.reverse_cymbal(dur=beat), 1.0)
    # outro : break, accord ouvert, puis impact sur le logo
    s.hit("keys", bo, M.epiano(Am9, dur=3 * beat, vel=0.75))
    s.hit("pad", bo, M.pad(Am9, dur=6 * beat, cutoff=1200, attack=0.6))
    for i, n in enumerate(("A4", "C5", "E5", "G5", "B5", "E6")):
        s.hit("kal", bo + 0.5 + i * 0.5, M.kalimba(n, vel=0.55))
    tf = T["fill"]
    s.kicks.append(tf)
    s.at("kick", tf, M.kick(decay=3.5), 1.0)
    s.at("fx", tf, M.impact(dur=2.5), 0.7)
    s.at("fx", tf, M.crash(dur=2.5), 0.7)
    s.at("log", tf, M.log_drum(m("C2"), dur=1.5, decay=2.0), 1.0)
    Cadd9 = M.chord("E4", "G4", "B4", "D5")
    s.at("keys", tf, M.epiano(Cadd9, dur=2.0, vel=0.85))
    s.at("pad", tf, M.pad(Cadd9, dur=2.2, cutoff=2400, release=1.2))
    for i, n in enumerate(("C6", "E6", "G6", "B6")):
        s.at("bell", T["word"] + i * 0.1, M.bell(n, dur=2.0, vel=0.55 - i * 0.08))
    return s.render()


SCORES["app"] = score_app


def score_vsl(T, duration):
    """Afro-pop lumineuse 104 BPM (do majeur, I-V-vi-IV) : marimba, snaps, basse pluck ; tension sur l'accroche."""
    bpm = 104
    beat = 60 / bpm
    s = Song(duration + 0.3, bpm, t0=0.0, swing=0.1)
    s.track("kick", gain=0.7)
    s.track("clap", gain=0.38, reverb=0.25)
    s.track("snap", gain=0.3, reverb=0.3, pan=0.2)
    s.track("hat", gain=0.2, pan=0.3)
    s.track("shaker", gain=0.3, pan=-0.3)
    s.track("conga", gain=0.3, pan=-0.2, reverb=0.12)
    s.track("bass", gain=0.42, duck=0.4)
    s.track("mar", gain=0.4, pan=0.15, reverb=0.3, delay=0.18)
    s.track("keys", gain=0.32, pan=-0.12, reverb=0.3, duck=0.3)
    s.track("pad", gain=0.15, reverb=0.45, duck=0.4)
    s.track("bell", gain=0.3, reverb=0.5, delay=0.2)
    s.track("fx", gain=0.5, reverb=0.3)
    C = M.chord("E4", "G4", "C5")
    G = M.chord("D4", "G4", "B4")
    Am = M.chord("E4", "A4", "C5")
    F = M.chord("F4", "A4", "C5")
    prog_ = [(C, "C2"), (G, "G1"), (Am, "A1"), (F, "F1")]
    arp = {0: ["C5", "E5", "G5", "E5"], 1: ["B4", "D5", "G5", "D5"], 2: ["A4", "C5", "E5", "C5"], 3: ["A4", "C5", "F5", "C5"]}

    def marimba_bar(bar, gain=1.0, dense=False):
        ci = bar % 4
        notes = arp[ci]
        for k in range(8 if not dense else 16):
            st = 0.5 if not dense else 0.25
            s.hit("mar", bar * 4 + k * st, M.marimba(notes[k % 4], vel=0.7 if k % 2 else 0.85), gain)

    def groove(bar, kick=True, extra=True):
        b0 = bar * 4
        ch, root = prog_[bar % 4]
        if kick:
            for k in range(4):
                s.kick_at(b0 + k, M.kick(f_lo=52, decay=7, click=0.3))
        s.hit("clap", b0 + 1, M.clap())
        s.hit("clap", b0 + 3, M.clap())
        for k in range(4):
            s.hit("hat", b0 + k + 0.5, M.hat(), 0.8)
        _shaker_bar(s, bar, gain=0.9)
        for off in (0, 0.75, 1.5, 2.5, 3.0):
            s.hit("bass", b0 + off, M.bass_pluck(m(root) + (12 if off == 1.5 else 0), dur=0.28), 0.9)
        for off in (0.5, 2.5):
            s.hit("keys", b0 + off, M.epiano(ch, dur=0.3, vel=0.6))
        s.hit("pad", b0, M.pad(ch, dur=4 * beat, cutoff=1800))
        if extra:
            for p, f in ((0.75, 260), (1.75, 210), (2.75, 260), (3.5, 200)):
                s.hit("conga", b0 + p, M.conga(f), 0.8)

    # bar 0 : marimba + snaps (accroche)
    marimba_bar(0, 0.8)
    for k in (1, 3):
        s.hit("snap", k, M.snap())
    s.hit("pad", 0, M.pad(C, dur=4 * beat, cutoff=900, attack=0.8))
    # bar 1 : le flot de notifications -> groove léger + percussions serrées (tension)
    groove(1, extra=False)
    s.track("perc", gain=0.3, pan=0.35, reverb=0.15)
    for k in range(16):
        s.hit("perc", 4 + k * 0.25, M.rim(), 0.25 + 0.03 * k)
    marimba_bar(1, 0.7, dense=True)
    # bar 2 : "aucune visibilité" -> tout s'arrête, nappe sombre, montée
    s.hit("pad", 8, M.pad(Am, dur=4 * beat, cutoff=700, attack=0.05))
    s.hit("bass", 8, M.sub("A1", dur=1.5), 0.9)
    s.at("fx", s.bt(9), M.riser(dur=5 * beat), 0.6)
    # bar 3 : "Découvrez" puis AgroSfer (impact à 3,5 mesures)
    for k in (12, 13):
        s.hit("snap", k + 0.5, M.snap(), 0.8)
    s.at("fx", s.bt(13), M.reverse_cymbal(dur=beat), 0.9)
    s.kick_at(14, M.kick(decay=4))
    s.hit("fx", 14, M.crash(dur=2.0), 0.7)
    s.hit("keys", 14, M.epiano(M.chord("C4", "E4", "G4", "D5"), dur=1.0, vel=0.8))
    for i, n in enumerate(("C6", "E6", "G6")):
        s.hit("bell", 14 + 0.25 + i * 0.25, M.bell(n, dur=1.5, vel=0.5))
    # bars 4-9 : fonctionnalités, groove complet + mélodie
    hook = [(0, "E5"), (0.5, "G5"), (1, "A5"), (1.5, "G5"), (2.5, "E5"), (3, "D5"), (3.5, "C5")]
    for bar in range(4, 10):
        groove(bar)
        marimba_bar(bar, 0.45)
        if bar % 2 == 0:
            for p, n in hook:
                s.hit("bell", bar * 4 + p, M.bell(n, dur=0.8, vel=0.35))
        if bar in (4, 7):
            s.hit("fx", bar * 4, M.crash(dur=1.6), 0.5)
    # bars 10-11 : l'offre, montée
    groove(10)
    groove(11, kick=True)
    marimba_bar(10, 0.6, dense=True)
    marimba_bar(11, 0.6, dense=True)
    for k in range(8):
        s.hit("clap", 46 + k * 0.25, M.clap(dur=0.15), 0.3 + 0.07 * k)
    s.at("fx", s.bt(44), M.riser(dur=4 * beat), 0.6)
    s.at("fx", s.bt(47), M.reverse_cymbal(dur=beat), 1.0)
    # bar 12 : fin, accord résolu, carillon au clic
    s.kick_at(48, M.kick(decay=3.5))
    s.hit("fx", 48, M.crash(dur=2.5), 0.8)
    s.hit("fx", 48, M.impact(dur=2.0), 0.5)
    Cmaj9 = M.chord("E4", "G4", "B4", "D5")
    s.hit("keys", 48, M.epiano(Cmaj9, dur=2.5, vel=0.8))
    s.hit("pad", 48, M.pad(Cmaj9, dur=3.0, cutoff=2400, release=1.2))
    s.hit("bass", 48, M.sub("C2", dur=2.0, release=1.0))
    for k in range(8):
        s.hit("shaker", 48 + k * 0.25, M.shaker(), [1, 0.4, 0.7, 0.4][k % 4] * (1 - k / 10))
    for i, n in enumerate(("C5", "E5", "G5", "C6")):
        s.at("mar", T["click"] + 0.05 + i * 0.09, M.marimba(n, vel=0.7))
    return s.render()


SCORES["vsl"] = score_vsl
