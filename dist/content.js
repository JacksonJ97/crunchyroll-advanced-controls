"use strict";
console.log("[CAC] Content script loaded");
function getVideo() {
    return (document.querySelector("video") ||
        document.querySelector("video#bitmovinplayer-video-null"));
}
function getPlaybackMenu() {
    return document.querySelector('[aria-label="Playback Speed"]');
}
function setPlaybackSpeed(video, speed) {
    video.playbackRate = speed;
}
function createPlaybackMenu(video) {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const menu = document.createElement("div");
    menu.className = "kat:overflow-y-auto kat:max-h-468";
    const elements = speeds.map((speed) => createPlaybackMenuItem(video, speed));
    elements.forEach((element) => menu.appendChild(element));
    return menu;
}
function createPlaybackMenuItem(video, speed) {
    const item = document.createElement("div");
    item.role = "menuitemradio";
    item.ariaLabel = `${speed}x`;
    item.ariaChecked = "false";
    item.ariaDisabled = "false";
    item.tabIndex = 0;
    item.className =
        "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500";
    item.addEventListener("click", () => setPlaybackSpeed(video, speed));
    item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setPlaybackSpeed(video, speed);
        }
    });
    const wrapper = document.createElement("div");
    wrapper.className =
        "kat:flex kat:flex-col kat:flex-1 kat:min-w-0 kat:gap-2 kat:text-start";
    item.appendChild(wrapper);
    const label = document.createElement("span");
    label.className = "kat:text-sm kat:leading-20 kat:text-neutral-50";
    label.textContent = `${speed}x`;
    wrapper.appendChild(label);
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "kat:w-24 kat:h-24 kat:shrink-0";
    item.appendChild(iconWrapper);
    return item;
}
let currentVideo = null;
let playbackMenu = null;
let playbackMenuButton = null;
function getPlaybackMenuButton() {
    return document.querySelector('button[aria-label="Playback Speed Menu"]');
}
function onRateChange() {
    console.log("[CAC] Rate changed");
}
const observer = new MutationObserver(() => {
    const video = getVideo();
    if (video !== currentVideo) {
        currentVideo?.removeEventListener("ratechange", onRateChange);
        currentVideo = video;
        playbackMenu = video ? createPlaybackMenu(video) : null;
        video?.addEventListener("ratechange", onRateChange);
    }
    const menu = getPlaybackMenu();
    if (!menu || !playbackMenu || playbackMenu.parentElement === menu) {
        return;
    }
    const originalMenu = menu.lastElementChild;
    if (originalMenu instanceof HTMLElement) {
        originalMenu.style.display = "none";
    }
    menu.appendChild(playbackMenu);
});
observer.observe(document.body, {
    subtree: true,
    childList: true,
});
