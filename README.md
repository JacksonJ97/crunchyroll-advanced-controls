# Advanced Video Controls for Crunchyroll

A Chrome extension that adds 1.25x, 1.5x, and 2x playback options directly to Crunchyroll's video player and provides keyboard shortcuts to rewind and skip forward.

## Motivation

Watching One Piece, a series known for its pacing issues, made me want faster playback options. Since Crunchyroll's video player doesn't currently support speeds above 1x, I built this extension. I wanted the playback speed controls to feel native to Crunchyroll, so I integrated them directly into the video player rather than relying on an extension popup. I also added keyboard shortcuts to skip forward and backward, since using the arrow keys on my 60% keyboard requires holding an extra key.

## Overview

The extension keeps Crunchyroll's existing playback menu trigger and menu container, hides the original menu content, and mounts its own speed options inside that container. Selecting an option changes the HTML video element's `playbackRate`. Options can be selected by clicking or pressing Enter or Space.

The script restores a supported saved speed at startup or defaults to 1x, then applies that target speed to replacement videos. Crunchyroll resets playback to 1x when playback controls are used, so the script listens for playback events and restores the target speed. The button label and selected menu item reflect the video's rate after synchronization.

Press **J** to rewind 10 seconds or **L** to skip forward 10 seconds.

## Local Installation

1. Clone this repository and run `pnpm install`.
2. Run `pnpm build` to compile the current source into `dist/content.js`.
3. Open `chrome://extensions` in Chrome and enable **Developer mode**.
4. Choose **Load unpacked** and select this repository's `dist` directory.
5. Open or refresh a Crunchyroll page to load the content script.

## How It Works

### Architecture and entry point

The runtime is a single content script, written in [`src/content.ts`](src/content.ts). TypeScript compiles it to `dist/content.js`. The Manifest V3 configuration in `dist/manifest.json` registers that script for `https://www.crunchyroll.com/*`.

The script uses five selectors to find the first matching element in its document:

| Element               | Selector                                        | Purpose                                 |
| --------------------- | ----------------------------------------------- | --------------------------------------- |
| Video                 | `video`                                         | Read and update playback speed.         |
| Rewind button         | `button[aria-label="Jump backward 10 seconds"]` | Rewind through the native button.       |
| Forward button        | `button[aria-label="Jump forward 10 seconds"]`  | Skip forward through the native button. |
| Playback menu trigger | `button[aria-label="Playback Speed Menu"]`      | Display the current speed.              |
| Playback menu         | `div[role="menu"][aria-label="Playback Speed"]` | Host the custom options.                |

### Finding and tracking the player

`syncPlayerControls()` runs at startup and whenever a `MutationObserver` detects added or removed nodes under `document.body`. This handles controls that appear later or are replaced during navigation without polling.

Each synchronization pass:

1. Finds the current video, native playback menu, and menu trigger.
2. Calls `updateVideo()` to track the video and synchronize its speed.
3. Calls `updatePlaybackMenuTrigger()` to cache the speed button and refresh its label.
4. Calls `mountCustomPlaybackMenu()` to insert the custom options if needed.

`updateVideo()` tracks the video in `currentVideo`. When the video changes, it removes the old video's listeners, attaches `PLAYBACK_SYNC_EVENTS` listeners to the new video, and applies `targetPlaybackSpeed`. It skips unchanged video references and clears the menu selection when no video is available.

### Keyboard seek shortcuts

`handleSeekKeydown()` listens for **J** and **L** key presses on `window` to seek backward or forward 10 seconds through Crunchyroll's native buttons. It finds the corresponding button on each eligible key press, so shortcuts keep working when Crunchyroll replaces its controls.

### Building and mounting the menu

`createCustomPlaybackMenu()` builds options from `PLAYBACK_SPEEDS`: 0.5x, 0.75x, 1x, 1.25x, 1.5x, and 2x. Selecting an option by clicking or pressing Enter or Space calls `setPlaybackSpeed()` to apply and save the speed when a video is available, then closes the menu through Crunchyroll's existing button.

`mountCustomPlaybackMenu()` hides the original content and inserts the custom options once Crunchyroll's menu container is available, keeping the native button and container to manage opening and closing. The custom menu is reused across video changes and remounted if Crunchyroll recreates the container.

### Keeping playback state and UI synchronized

At startup, `targetPlaybackSpeed` is set to the saved `localStorage` preference if it matches a value in `PLAYBACK_SPEEDS`; otherwise, it defaults to 1x. Selecting a custom menu option updates both the target and the saved preference.

`syncPlaybackSpeed()` keeps the video at that speed across video changes and playback events (`PLAYBACK_SYNC_EVENTS`), correcting Crunchyroll's resets to 1x. It also updates the button label and calls `refreshSelection()` to keep the menu's selected state and check icon in sync with the video's actual speed.

The script only updates controls when their state changes, avoiding redundant DOM writes and repeated observer updates.

### Limitations

The current implementation depends on Crunchyroll's DOM structure, accessibility labels, and existing `kat:` styles. Changes to those selectors, classes, or the assumption that native menu content is the container's last element child may require code updates.

## Development

Run `pnpm install` to install the development dependencies, then `pnpm build` to compile `src/content.ts` into `dist/content.js`. Use `pnpm dev` to compile automatically as source files change. After rebuilding, reload the extension in `chrome://extensions` and refresh the Crunchyroll page to use the updated script.
