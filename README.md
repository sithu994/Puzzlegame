# Lumina Slide — Facebook Instant Game

## Features Included
1. **Progressive Level Scaling (`9 -> 16 -> 25 -> 36 -> 49` tiles)**:
   - **Level 1**: 3x3 Grid (9 tiles)
   - **Level 2**: 4x4 Grid (16 tiles)
   - **Level 3**: 5x5 Grid (25 tiles)
   - **Level 4**: 6x6 Grid (36 tiles)
   - **Level 5+**: 7x7 Grid (49 tiles)
2. **Facebook Instant Games SDK (`v7.1`)**:
   - Loading screen progress (`FBInstant.initializeAsync()` & `FBInstant.startGameAsync()`)
   - Displays player's Facebook profile photo and name
   - Cloud save (`FBInstant.player.setDataAsync`) for current level and best scores
   - Friend challenge sharing (`FBInstant.shareAsync`)
3. **Calm, Mind-Relaxing Background Music**:
   - Built-in Web Audio API ambient synthesizer playing warm harmonic chords (`Fmaj7 -> Cmaj7 -> Am7 -> G6`) and soft pentatonic chimes.

## How to Upload to Facebook Instant Games
1. Go to Meta for Developers (https://developers.facebook.com/) and create an app with the **Instant Games** product enabled.
2. Upload this `.zip` bundle directly under **Instant Games -> Web Hosting -> Upload Version**.
3. Push the build to **Production** and test on Facebook / Messenger.
