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
