console.log("[CAC] Content script loaded");

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const PLAYBACK_SYNC_EVENTS = [
  "play",
  "pause",
  "seeked",
  "seeking",
  "ratechange",
] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

let currentVideo: HTMLVideoElement | null = null;
let playbackMenuTrigger: HTMLButtonElement | null = null;

const savedPlaybackSpeed = Number(localStorage.getItem("playbackRate"));
let targetPlaybackSpeed =
  PLAYBACK_SPEEDS.find((speed) => speed === savedPlaybackSpeed) ?? 1;

function getVideo(): HTMLVideoElement | null {
  return document.querySelector("video");
}

function getRewindButton(): HTMLButtonElement | null {
  return document.querySelector(
    'button[aria-label="Jump backward 10 seconds"]',
  );
}

function getForwardButton(): HTMLButtonElement | null {
  return document.querySelector('button[aria-label="Jump forward 10 seconds"]');
}

function getPlaybackMenuTrigger(): HTMLButtonElement | null {
  return document.querySelector('button[aria-label="Playback Speed Menu"]');
}

function getPlaybackMenu(): HTMLDivElement | null {
  return document.querySelector(
    'div[role="menu"][aria-label="Playback Speed"]',
  );
}

function createCheckIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("width", "24");
  icon.setAttribute("height", "24");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("class", "kat:w-24 kat:h-24 kat:shrink-0 kat:text-white");
  icon.ariaHidden = "true";
  icon.innerHTML = `
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15.7929 8.29289L17.2071 9.70711L10.5 16.4142L6.79289 12.7071L8.20711 11.2929L10.5 13.5858L15.7929 8.29289Z"
      fill="currentColor"
    ></path>`;

  return icon;
}

function setPlaybackSpeed(speed: PlaybackSpeed) {
  if (!currentVideo) return;

  currentVideo.playbackRate = speed;
  targetPlaybackSpeed = speed;
  localStorage.setItem("playbackRate", `${speed}`);
}

function createPlaybackMenuItem(speed: PlaybackSpeed) {
  const item = document.createElement("div");
  item.role = "menuitemradio";
  item.tabIndex = 0;
  item.className =
    "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500";

  item.addEventListener("click", (event) => {
    event.preventDefault();
    setPlaybackSpeed(speed);
    playbackMenuTrigger?.click();
  });
  item.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setPlaybackSpeed(speed);
    playbackMenuTrigger?.click();
  });

  const label = document.createElement("span");
  label.className =
    "kat:text-sm kat:leading-20 kat:text-neutral-50 kat:flex-1 kat:min-w-0 kat:text-start";
  label.textContent = `${speed}x`;
  item.appendChild(label);

  const icon = createCheckIcon();
  item.appendChild(icon);

  let previousSelectionState: boolean | null = null;

  function setSelected(isSelected: boolean) {
    if (isSelected === previousSelectionState) return;
    previousSelectionState = isSelected;

    item.ariaChecked = String(isSelected);
    item.classList.toggle("kat:bg-white/6", isSelected);
    icon.style.visibility = isSelected ? "visible" : "hidden";
  }

  return { element: item, setSelected };
}

function createCustomPlaybackMenu() {
  const menu = document.createElement("div");
  menu.className = "kat:overflow-y-auto kat:max-h-468";

  const items = PLAYBACK_SPEEDS.map((speed) => {
    const { element, setSelected } = createPlaybackMenuItem(speed);
    return { speed, element, setSelected };
  });

  items.forEach(({ element }) => menu.appendChild(element));

  function refreshSelection() {
    const currentSpeed = currentVideo?.playbackRate;

    items.forEach(({ speed, setSelected }) => {
      setSelected(speed === currentSpeed);
    });
  }

  refreshSelection();

  return { element: menu, refreshSelection };
}

const customPlaybackMenu = createCustomPlaybackMenu();

function updatePlaybackMenuTriggerLabel() {
  if (!currentVideo || !playbackMenuTrigger) return;

  const label = `${currentVideo.playbackRate}x`;

  if (playbackMenuTrigger.textContent !== label) {
    playbackMenuTrigger.textContent = label;
  }
}

function syncPlaybackSpeed() {
  if (!currentVideo) return;

  if (currentVideo.playbackRate !== targetPlaybackSpeed) {
    currentVideo.playbackRate = targetPlaybackSpeed;
  }

  updatePlaybackMenuTriggerLabel();
  customPlaybackMenu.refreshSelection();
}

function updateVideo(nextVideo: HTMLVideoElement | null) {
  if (nextVideo === currentVideo) return;

  if (currentVideo) {
    for (const event of PLAYBACK_SYNC_EVENTS) {
      currentVideo.removeEventListener(event, syncPlaybackSpeed);
    }
  }

  currentVideo = nextVideo;

  // If the new video is null we refresh the selection so that it clears the selected option
  if (!currentVideo) {
    customPlaybackMenu.refreshSelection();
    return;
  }

  for (const event of PLAYBACK_SYNC_EVENTS) {
    currentVideo.addEventListener(event, syncPlaybackSpeed);
  }

  // Updates the new video to the target playback speed
  syncPlaybackSpeed();
}

function updatePlaybackMenuTrigger(trigger: HTMLButtonElement | null) {
  playbackMenuTrigger = trigger;
  updatePlaybackMenuTriggerLabel();
}

function mountCustomPlaybackMenu(menu: HTMLDivElement | null) {
  if (!menu || customPlaybackMenu.element.parentElement === menu) return;

  const menuContent = menu.lastElementChild;

  if (menuContent instanceof HTMLElement) {
    menuContent.style.display = "none";
  }

  menu.appendChild(customPlaybackMenu.element);
}

function syncPlayerControls() {
  const video = getVideo();
  const playbackMenu = getPlaybackMenu();
  const playbackMenuTrigger = getPlaybackMenuTrigger();

  updateVideo(video);
  updatePlaybackMenuTrigger(playbackMenuTrigger);
  mountCustomPlaybackMenu(playbackMenu);
}

const playerDomObserver = new MutationObserver(syncPlayerControls);

playerDomObserver.observe(document.body, {
  subtree: true,
  childList: true,
});

syncPlayerControls();

function handleSeekKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  if (key !== "j" && key !== "l") return;

  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.isComposing
  ) {
    return;
  }

  const target = event.target;

  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select"))
  ) {
    return;
  }

  const seekButton = key === "j" ? getRewindButton() : getForwardButton();

  if (!seekButton || !seekButton.isConnected || seekButton.disabled) return;

  event.preventDefault();
  seekButton.click();
  const focusedElement = document.activeElement;

  if (focusedElement instanceof HTMLElement) {
    focusedElement.blur();
  }
}

window.addEventListener("keydown", handleSeekKeydown);
