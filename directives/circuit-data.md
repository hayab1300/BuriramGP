# Chang International Circuit — Corner Data Directive

## Goal
Provide the single source of truth for all 12 corners of the Chang International Circuit (Buriram, Thailand). All UI components, the pseudo-3D engine, and the Quiz system MUST read from `data/corners.json`, which is derived from this directive.

## Circuit Facts
- **Total length**: 4.554 km
- **Direction**: Clockwise
- **Turns**: 12 (7 right, 5 left)
- **Main straight**: ~1000 m (Start/Finish to Turn 1)
- **Back straight**: ~600 m (Turn 3 to Turn 5 area)
- **Location**: Buriram, Thailand (14°57′46″N 103°5′6″E)
- **Designer**: Hermann Tilke
- **Certification**: FIA Grade 1 + FIM Grade A
- **Lap record approx**: ~1:29–1:30 (MotoGP)

## Corner Table

| # | Dir | Nickname | Entry speed | Exit speed | Gear | Braking (0-10) | Notes |
|---|-----|----------|-------------|------------|------|----------------|-------|
| 1 | R   | Start Hairpin | 290 km/h | 80 km/h | 1st | 9 | After S/F straight. Heavy braking. First overtaking point. |
| 2 | L   | Kink Left | 180 km/h | 210 km/h | 3rd | 3 | Fast chicane exit, near full throttle. |
| 3 | R   | The Hammer | 327 km/h | 77 km/h | 1st | 10 | HARDEST braking on calendar. 293m zone, 5.2kg lever force, 1.8G decel. After ~1000m straight. |
| 4 | L   | Second Apex | 130 km/h | 150 km/h | 2nd | 5 | Linked chicane with T3. Tight apex. |
| 5 | R   | Thai Tight | 240 km/h | 100 km/h | 2nd | 8 | White-line braking marker on right. Go as tight as possible. |
| 6 | L   | Flowing Left | 220 km/h | 205 km/h | 4th | 2 | High-speed sweeper. Minimal braking. Carry max speed. |
| 7 | R   | Back Straight Entry | 200 km/h | 185 km/h | 3rd | 3 | Opens up the middle sector. Feeds into back sections. |
| 8 | L   | Sweeper | 210 km/h | 195 km/h | 4th | 2 | Constant-radius high-speed sweeper. |
| 9 | R   | Inner Loop | 140 km/h | 120 km/h | 2nd | 6 | Slow technical section. 2nd gear. Must feed T10 correctly. |
| 10 | L   | Inner Exit | 120 km/h | 130 km/h | 2nd | 5 | Tight follow-on to T9. Links to final sector. |
| 11 | R   | Fast Right | 220 km/h | 200 km/h | 4th | 3 | High-grip run to the final complex. |
| 12 | L   | Glory Corner | 290 km/h | 90 km/h | 1st | 9 | LAST-LAP DRAMA. 213m braking zone. Orange board marker on left tire wall. Short run to finish = prime overtaking. |

## Braking Severity Scale
- 10 = Hardest on the MotoGP calendar
- 8-9 = Very hard, significant deceleration
- 5-7 = Medium, technical braking
- 2-4 = Light, carry speed through
- 0-1 = Nearly full throttle

## Known Edge Cases
- T3 and T4 are a chicane complex — represent as two linked segments in the 3D engine
- T9 and T10 are a slow infield loop — reduce speed significantly
- T12 is followed by a very short straight to the finish line

## Tools (Scripts)
- `data/corners.json` — canonical JSON derived from this directive
