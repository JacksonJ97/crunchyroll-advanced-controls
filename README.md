# Advanced Video Controls for Crunchyroll

A Chrome extension that adds 1.25x, 1.5x, and 2x playback speeds directly to Crunchyroll's video player, plus keyboard shortcuts to rewind and skip forward.

## Motivation

I built this extension while watching One Piece, a series known for its pacing issues. Crunchyroll's video player currently doesn't offer playback speeds above 1x. While existing extensions provide this functionality through an extension popup, I wanted the playback speed controls to feel native to Crunchyroll by integrating them directly into the video player.

## Overview

The extension keeps Crunchyroll's existing speed button and menu container, hides the native menu content, and mounts its own speed options inside that container. Selecting an option changes the HTML video element's `playbackRate`. The button label and selected menu item reflect the video's actual rate, including changes made outside the custom menu.

Press **J** to rewind 10 seconds or **L** to skip forward 10 seconds. These shortcuts trigger the player's existing seek buttons and are ignored while typing in form fields or editable content.

## How It Works

### Architecture and entry point

The runtime is a single content script, written in [`src/content.ts`](src/content.ts). TypeScript compiles it to `dist/content.js`. The Manifest V3 configuration in `dist/manifest.json` registers that script for `https://www.crunchyroll.com/*`. There is no background service worker or popup; playback control and UI updates happen in the page's DOM.

The script uses five selectors to find the first matching element in its document:

| Element               | Selector                                        | Purpose                                 |
| --------------------- | ----------------------------------------------- | --------------------------------------- |
| Video                 | `video`                                         | Read and update playback speed.         |
| Speed button          | `button[aria-label="Playback Speed Menu"]`      | Display the current speed.              |
| Rewind button         | `button[aria-label="Jump backward 10 seconds"]` | Rewind through the native button.       |
| Forward button        | `button[aria-label="Jump forward 10 seconds"]`  | Skip forward through the native button. |
| Native menu container | `div[role="menu"][aria-label="Playback Speed"]` | Host the custom options.                |

### Finding and tracking the player

The script calls `syncPlayerControls()` immediately and registers a `MutationObserver` on `document.body` with `childList: true` and `subtree: true`. Added or removed nodes anywhere under the body trigger another synchronization pass. This handles player controls that appear later or are replaced during navigation without polling. The observer does not watch attribute changes.

Each synchronization pass:

1. Queries the video and passes it to `trackVideo()`.
2. Queries the current speed button and refreshes its label.
3. Queries the rewind and forward buttons and updates their stored references.
4. Queries the native menu container and attempts to mount the custom menu.

Five module-level references preserve state between passes: `trackedVideo`, `customSpeedMenu`, `speedButton`, `rewindButton`, and `forwardButton`. If the video reference has not changed, `trackVideo()` returns immediately. When a different video appears, it removes the old video's `ratechange` listener, creates a menu bound to the new video, and attaches the listener to that video. If no video is found, it clears the tracked video and menu references.

### Keyboard seek shortcuts

The script registers `handleSeekKeydown()` on `window` once per content-script execution, after the initial synchronization. The observer updates the button references without registering additional keyboard listeners. Each key press reads the current references, so shortcuts continue to use replacement controls after DOM changes.

The handler normalizes the key to lowercase and returns immediately unless it is J or L. It ignores events already prevented by another handler, Ctrl/Alt/Meta combinations, input composition, and events from inputs, textareas, selects, or editable content. Uppercase J and L also work.

For an eligible key press, the handler selects the corresponding button and checks that it exists, is still connected to the document, and is not disabled. Only then does it call `preventDefault()` and `click()`, letting the native button perform the seek. Holding a shortcut key can trigger repeated seeks through repeated `keydown` events.

### Building and mounting the menu

`createCustomSpeedMenu()` creates one item for each value in `SPEEDS`: `0.5`, `0.75`, `1`, `1.25`, `1.5`, and `2`. Each item's event handlers capture the video element that the menu was created for. A click, Enter, or Space calls `setPlaybackSpeed()`, which assigns the selected value to `video.playbackRate`.

The items reuse Crunchyroll's `kat:` CSS classes for layout, hover, focus, and selection styling. Each item has `role="menuitemradio"`, is focusable with `tabIndex = 0`, and contains a speed label and an SVG check icon.

`mountCustomSpeedMenu()` waits until both a video-bound menu and the native container exist. If the custom menu is already a direct child of that container, it returns without changing the DOM. Otherwise, it hides the container's last element child with `display: none` and appends the custom menu. The native button and outer menu container remain in place, so Crunchyroll continues to manage opening and closing the menu.

The same custom menu is reused while the video element stays the same. If Crunchyroll recreates the container, the next synchronization pass moves that menu into the new container.

### Keeping playback state and UI synchronized

The video's `playbackRate` is the source of truth. A `ratechange` event calls `handlePlaybackRateChange()`, which updates the button label and runs the menu's `refreshSelection()` function. That function compares each option with the actual rate and updates its `aria-checked` value, background class, and check-icon visibility. Selection is also initialized when the menu is created.

To avoid unnecessary DOM writes, `refreshSpeedButtonLabel()` only changes the button's text when it differs, and each item's `setActive()` caches its previous active state. These guards, together with the video-reference and menu-parent checks, let repeated observer callbacks reuse existing controls. They also prevent the extension's own child-node changes from causing an endless update cycle.

### Current boundaries

The implementation depends on Crunchyroll's DOM structure, English accessibility labels, and existing `kat:` styles. Changes to those selectors, classes, or the assumption that native menu content is the container's last element child may require code updates. It controls only the first video found in the content script's document.

The extension does not save a preferred speed or apply it to replacement videos. A new menu reflects its video's existing rate. If an external control sets a rate outside `SPEEDS`, the button displays that rate and no custom option is selected.

## Development

Run `pnpm install` to install the TypeScript development dependency, then `pnpm build` to compile `src/content.ts` into `dist/content.js`. Use `pnpm dev` to compile automatically as source files change. These commands compile the script; they do not generate the manifest or icons in `dist`.
