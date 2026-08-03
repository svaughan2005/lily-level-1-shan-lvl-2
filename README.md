# TACTIC
## Group 3A

## Description
A small browser platformer (vanilla HTML/CSS/JS, no build tools needed) made for a school assignment. Inspired by "Level Devil"-style rage-platformers, but reframed: each level's "gotcha" mechanic represents a different way a tic can present in Tourette Syndrome. 

All 5 stages within level 1 are stitched together into one continuous, side-scrolling
map. Walk right and you'll pass through all of them in order.

1. **Irregular Small Tics** — a flashing dogs appears without warning; jump over it.
2. **Cause-and-Effect Tics** — the floor looks perfectly normal, but jumping near certain spots causes the ground there to collapse a moment later. Triggered by your own action.
3. **Delayed Tics** — two platforms swing back and forth on their own timing; you have to time your jump to their rhythm rather than your own.
4. **Persistent Tics** — a gap that keeps widening once you've crossed it, so hesitating costs you.
5. **Blinking Tics** — a vertical climb with a challenging course where objects move and flicker in and out of view.

Each of the 5 sections ends at a mailbox, touching one will set that mailbox as your checkpoint. If you die anywhere on the map, you respawn at the most recent mailbox you've touched (or at the very start of the map if you
haven't reached one yet), not from the very beginning. Reaching the final mailbox at the end of the map completes the level.

## Design Rationale
Through the game's theme, interactive cues, visual composition, graphics, and sound design, players can naturally identify which objects they can interact with and which they should avoid. Contextual feedback also helps communicate the purpose of each element. For example, an angry dog visually signals that it is a hazard and should be avoided. Similarly, solid black gaps that line up with the ground indicate that the floor is broken and unsafe to walk on. These affordances allow players to quickly understand the environment and learn how to respond to obstacles without relying on explicit instructions.

The game is structured by levels with checkpoints, allowing players to obtain small achievements that encourages them to continue through the entire level. Stages within the level start easy to teach basic mechanics and affordances and get progressively more challenging at a steady slow rate. Players will face obstacles they've encountered before, encouraging them to use the knowledge and strategies they've already developed.

Each level is designed around a different type of tic, such as irregular, cause-and-effect, or delayed tics, with obstacles appearing or changing. Tourette's syndrome is represented through these obstacles that interrupt the player’s progress, symbolizing the unpredictable nature of tics. This encourages players to be attentive within the game, adapt in the moment, and respond to unexpected challenges which reflect the real-life experience of managing tics.

## Setup and Interaction Instructions

Open `index.html` in any modern browser (double-click it, or serve the folder with
any static file server, e.g. `npx serve .` or `python3 -m http.server`).

Note: This game saves your level progression and accomplishments in your browser. Anyone using the same browser and device will share the same saved progress. To start fresh, open the game in an Incognito/Private window, use a different browser or browser profile, or clear this site's browser data.

- Left / Right arrow (or A / D): move
- Up arrow / Space / W: jump
- Esc: pause menu (restart from checkpoint, or return to the main menu)
- ⟲ button (top-right): restart from your latest checkpoint

## Iteration Notes

Post Play test:
- Decreased the difficulty of level 1 stage 5 by reducing number of dogs that flash in.
- Changed the mailboxes from portals to checkpoints, creating a continuous level instead of separate stages.
- Changed the harzard boxes to dogs so players can better understand that the object is an obstacle.

Post Showcase:
- We plan to edit level progression to be more graudual and intuitive by reducing the required mechanics within the early levels as some players have found the difficulty to have increased too quickly. We plan to also do this by not making them die by falling through the ground so easily, offering an alternative to climb back out if they fall down.
- We also plan to update and align the hitboxes for graphics and visual indicators to make the experience more smooth and intuitive for players as some harzards weren't made clear enough.

## Assets

| Files                                      | Source                             |
| ------------------------------------------ | ---------------------------------- |
| `assets/images/mailman.png`                | Created in Copilot                 |
| `assets/images/mailbox.png`                | Created in Copilot                 |
| `assets/images/levelbg.png`                | Created in Copilot                 |
| `assets/images/titlebg.png`                | Created in Copilot                 |
| `assets/images/2box.png`                   | Created in Copilot                 |
| `assets/images/BG.png`                     | Created in Copilot                 |
| `assets/images/whitedoc.png`               | Created in Copilot                 |
| `assets/images/dog.png`                    | Created in Copilot                 |
| `assets/images/levelbox.png`               | Created in Copilot                 |
| `assets/images/levelselectbg.png`          | Created in Copilot                 |
| `assets/images/mailboxdown.png`            | Created in Copilot                 |
| `assets/images/mailboxup.png`              | Created in Copilot                 |
| `assets/images/mailman.png`                | Created in Copilot                 |
| `assets/images/titlebg.png`                | Created in Copilot                 |
| `assets/sounds/background_music.mp3` [1]   | Sourced from Youtube               |
| `assets/sounds/button_click.mp3` [2]       | Sourced from Pixabay               |
| `assets/sounds/game_music.mp3` [4]         | Sourced from Pixabay               |
| `assets/sounds/jump_sound.mp3` [3]         | Sourced from Pixabay               |
| `assets/sounds/mailbox_bell.mp3` [5]       | Sourced from Pixabay               |


## References

[1] YouTube. n.d. PLobY7vO0pgVIOZNKTVRhkPzrfCjDJ0CNl – Video. Retrieved July 7, 2026 from https://www.youtube.com/watch?v=lK33mkGZ5Sg&list=PLobY7vO0pgVIOZNKTVRhkPzrfCjDJ0CNl&index=6

[2] Pixabay. n.d. Film Special Effects Button Click. Sound effect. Retrieved July 7, 2026 from https://pixabay.com/sound-effects/film-special-effects-button-click-289742/

[3] Pixabay. n.d. Film Special Effects Jump Sound. Sound effect. Retrieved July 7, 2026 from https://pixabay.com/sound-effects/film-special-effects-jump-sound-531048/

[4] Pixabay. n.d. Musical Music for Game Fun Kid Game. Sound effect. Retrieved July 7, 2026 from https://pixabay.com/sound-effects/musical-music-for-game-fun-kid-game-163649/

[5] Pixabay. n.d. Film Special Effects Bell Sound. Sound effect. Retrieved July 7, 2026 from https://pixabay.com/sound-effects/film-special-effects-bell-sound-370341/
