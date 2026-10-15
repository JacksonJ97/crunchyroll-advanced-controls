# Advanced Video Controls for Crunchyroll

A Chrome extension that adds 0.5x, 0.75x, 1x, 1.25x, 1.5x, and 2x playback options directly to Crunchyroll's video player, remembers your selected speed, and provides keyboard shortcuts to rewind and skip forward.

## Motivation

I built this extension while watching One Piece, a series known for its pacing issues, because Crunchyroll's video player doesn't currently support playback speeds above 1x. I wanted the playback speed controls to feel native to Crunchyroll, so I integrated them directly into the video player rather than relying on an extension popup.

## Overview

The extension keeps Crunchyroll's existing playback menu trigger and menu container, hides the original menu content, and mounts its own speed options inside that container. Selecting an option changes the HTML video element's `playbackRate`, saves the preference in the page's `localStorage`, and closes the menu through the existing playback menu trigger. Options support clicks, Enter, and Space.

The script restores a supported saved speed at startup, defaults to 1x otherwise, and applies that preference to replacement videos. Playback events restore the preferred speed if the player or another control changes it. The button label and selected menu item reflect the video's rate after synchronization.

Press **J** to rewind 10 seconds or **L** to skip forward 10 seconds. These shortcuts trigger the player's existing seek buttons and are ignored while typing in form fields or editable content.

## Local Installation

1. Clone this repository and run `pnpm install`.
2. Run `pnpm build` to compile the current source into `dist/content.js`.
3. Open `chrome://extensions` in Chrome and enable **Developer mode**.
4. Choose **Load unpacked** and select this repository's `dist` directory, which includes the manifest and icons.
5. Open or refresh a Crunchyroll page to load the content script.

## How It Works

### Architecture and entry point

The runtime is a single content script, written in [`src/content.ts`](src/content.ts). TypeScript compiles it to `dist/content.js`. The Manifest V3 configuration in `dist/manifest.json` registers that script for `https://www.crunchyroll.com/*`. There is no background service worker or popup; playback control and UI updates happen in the page's DOM.

The script uses five selectors to find the first matching element in its document:

| Element                 | Selector                                        | Purpose                                 |
| ----------------------- | ----------------------------------------------- | --------------------------------------- |
| Video                   | `video`                                         | Read and update playback speed.         |
| Speed button            | `button[aria-label="Playback Speed Menu"]`      | Display the current speed.              |
| Rewind button           | `button[aria-label="Jump backward 10 seconds"]` | Rewind through the native button.       |
| Forward button          | `button[aria-label="Jump forward 10 seconds"]`  | Skip forward through the native button. |
| Playback menu container | `div[role="menu"][aria-label="Playback Speed"]` | Host the custom options.                |

### Finding and tracking the player

The script registers a `MutationObserver` on `document.body` with `childList: true` and `subtree: true`, then calls `syncPlayerControls()` immediately. Added or removed nodes anywhere under the body trigger another synchronization pass. This handles player controls that appear later or are replaced during navigation without polling. The observer does not watch attribute changes.

Each synchronization pass:

1. Queries the video, native playback menu, and menu trigger.
2. Passes the video to `updateVideo()`.
3. Updates the cached menu trigger and refreshes its label.
4. Attempts to mount the custom menu in the native container.

The script caches the current video and menu trigger, creates one reusable `customPlaybackMenu`, and stores the preferred speed in `globalPlaybackSpeed`. If the video reference has not changed, `updateVideo()` returns immediately. When a different video appears, it removes the old video's listeners, attaches listeners for `ratechange`, `play`, `pause`, `seeking`, and `seeked` to the new video, and immediately synchronizes its speed. If no video is found, it clears the cached video and refreshes the menu to clear its selection.

### Keyboard seek shortcuts

The script registers `handleSeekKeydown()` on `window` once per content-script execution, after the initial synchronization. Each eligible key press queries the corresponding native seek button, so shortcuts continue to use replacement controls after DOM changes without caching seek-button references or registering additional listeners.

The handler normalizes the key to lowercase and returns immediately unless it is J or L. It ignores events already prevented by another handler, Ctrl/Alt/Meta combinations, input composition, and events from inputs, textareas, selects, or editable content. Uppercase J and L also work.

For an eligible key press, the handler selects the corresponding button and checks that it exists, is still connected to the document, and is not disabled. Only then does it call `preventDefault()` and `click()`, letting the native button perform the seek. Holding a shortcut key can trigger repeated seeks through repeated `keydown` events.

### Building and mounting the menu

`createCustomPlaybackMenu()` creates one item for each value in `SPEEDS`: `0.5`, `0.75`, `1`, `1.25`, `1.5`, and `2`. Each item's event handlers use the current cached video rather than capturing a particular video element. A click, Enter, or Space calls `setPlaybackSpeed()`, then clicks the cached native menu trigger to close the menu. If a cached video exists, `setPlaybackSpeed()` assigns its `playbackRate`, updates `globalPlaybackSpeed`, and saves the value in `localStorage` under `playbackRate`.

The items reuse Crunchyroll's `kat:` CSS classes for layout, hover, focus, and selection styling. Each item has `role="menuitemradio"`, is focusable with `tabIndex = 0`, and contains a speed label and an SVG check icon.

`mountCustomPlaybackMenu()` waits for the native container; mounting does not require a video to be present. If the custom menu is already a direct child of that container, it leaves the DOM unchanged. Otherwise, it hides the container's last element child with `display: none` if that child is an `HTMLElement`, then appends the custom menu. The native button and outer menu container remain in place, so Crunchyroll continues to manage opening and closing the menu.

The same custom menu is reused across video replacements. If Crunchyroll recreates the container, the next synchronization pass moves that menu into the new container.

### Keeping playback state and UI synchronized

At startup, the script converts the `localStorage` value at `playbackRate` to a number and checks it against `SPEEDS`. A supported value becomes `globalPlaybackSpeed`; otherwise, the preference starts at `1`.

`syncPlaybackSpeed()` runs when a new video is tracked and on its `ratechange`, `play`, `pause`, `seeking`, and `seeked` events. If the video's rate differs from `globalPlaybackSpeed`, it restores the preferred rate. A change made by the player or another control therefore does not become the new saved preference.

After synchronizing the rate, the function updates the button label and runs the menu's `refreshSelection()` function. That function compares each option with the cached video's actual rate and updates its `aria-checked` value, background class, and check-icon visibility. Selection is also initialized when the menu is created.

To avoid unnecessary DOM writes, `updatePlaybackMenuTriggerLabel()` only changes the button's text when it differs, and each item's `setActive()` caches its previous active state. These guards, together with the video-reference and menu-parent checks, let repeated observer callbacks reuse existing controls. They also prevent the extension's own child-node changes from causing an endless update cycle.

### Current boundaries

The implementation depends on Crunchyroll's DOM structure, English accessibility labels, and existing `kat:` styles. Changes to those selectors, classes, or the assumption that native menu content is the container's last element child may require code updates. It controls only the first video found in the content script's document.

Saved preferences use the page's `localStorage`, not Chrome extension storage. The script does not catch storage access errors or listen for storage changes from other tabs. Clearing that storage removes the saved preference for future script executions. Synchronization restores the selected preference if another control changes the video's rate.

## Development

Run `pnpm install` to install the TypeScript development dependency, then `pnpm build` to compile `src/content.ts` into `dist/content.js`. Use `pnpm dev` to compile automatically as source files change. These commands compile the script; they do not generate the manifest or icons in `dist`.

After rebuilding, reload the extension in `chrome://extensions` and refresh the Crunchyroll page to use the updated script. There is currently no automated test script configured in `package.json`.
