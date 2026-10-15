console.log("[CAC] Content script loaded");

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

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

function getPlaybackSpeedMenuTrigger(): HTMLButtonElement | null {
  return document.querySelector('button[aria-label="Playback Speed Menu"]');
}

function getPlaybackSpeedMenu(): HTMLDivElement | null {
  return document.querySelector(
    'div[role="menu"][aria-label="Playback Speed"]',
  );
}

let trackedVideo: HTMLVideoElement | null = null;
let rewindButton: HTMLButtonElement | null = null;
let forwardButton: HTMLButtonElement | null = null;
let playbackSpeedTrigger: HTMLButtonElement | null = null;

let customSpeedMenu: ReturnType<typeof createCustomSpeedMenu> | null = null;

let globalPlaybackSpeed = Number.isFinite(localStorage.getItem("playbackRate"))
  ? Number(localStorage.getItem("playbackRate"))
  : 1;

function setPlaybackSpeed(video: HTMLVideoElement, speed: Speed) {
  video.playbackRate = speed;
  globalPlaybackSpeed = speed;
  localStorage.setItem("playbackRate", `${speed}`);
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

function createSpeedMenuItem(video: HTMLVideoElement, speed: Speed) {
  const item = document.createElement("div");
  item.role = "menuitemradio";
  item.tabIndex = 0;
  item.className =
    "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500";

  item.addEventListener("click", (event) => {
    event.preventDefault();
    setPlaybackSpeed(video, speed);
    playbackSpeedTrigger?.click();
  });
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPlaybackSpeed(video, speed);
      playbackSpeedTrigger?.click();
    }
  });

  const label = document.createElement("span");
  label.className =
    "kat:text-sm kat:leading-20 kat:text-neutral-50 kat:flex-1 kat:min-w-0 kat:text-start";
  label.textContent = `${speed}x`;
  item.appendChild(label);

  const icon = createCheckIcon();
  item.appendChild(icon);

  let previousActive: boolean | null = null;

  function setActive(active: boolean) {
    if (active === previousActive) return;
    previousActive = active;

    item.ariaChecked = String(active);
    item.classList.toggle("kat:bg-white/6", active);
    icon.style.visibility = active ? "visible" : "hidden";
  }

  return { element: item, setActive };
}

function createCustomSpeedMenu(video: HTMLVideoElement) {
  const menu = document.createElement("div");
  menu.className = "kat:overflow-y-auto kat:max-h-468";

  const items = SPEEDS.map((speed) => {
    const { element, setActive } = createSpeedMenuItem(video, speed);
    return { speed, element, setActive };
  });

  items.forEach(({ element }) => menu.appendChild(element));

  function refreshSelection() {
    const currentSpeed = video.playbackRate;

    items.forEach(({ speed, setActive }) => {
      setActive(speed === currentSpeed);
    });
  }

  refreshSelection();

  return { element: menu, refreshSelection };
}

function syncPlaybackSpeed() {
  if (!trackedVideo || !playbackSpeedTrigger) return;

  if (trackedVideo.playbackRate !== globalPlaybackSpeed) {
    trackedVideo.playbackRate = globalPlaybackSpeed;
  }

  const text = `${trackedVideo.playbackRate}x`;
  if (playbackSpeedTrigger.textContent !== text) {
    playbackSpeedTrigger.textContent = text;
  }
}

function handlePlaybackRateChange() {
  syncPlaybackSpeed();
  customSpeedMenu?.refreshSelection();
}

function handlePlay() {
  syncPlaybackSpeed();
}

function handlePause() {
  syncPlaybackSpeed();
}

function handleSeeking() {
  syncPlaybackSpeed();
}

function handleSeeked() {
  syncPlaybackSpeed();
}

function trackVideo(currentVideo: HTMLVideoElement | null) {
  if (currentVideo === trackedVideo) return;

  trackedVideo?.removeEventListener("ratechange", handlePlaybackRateChange);
  trackedVideo?.removeEventListener("play", handlePlay);
  trackedVideo?.removeEventListener("pause", handlePause);
  trackedVideo?.removeEventListener("seeking", handleSeeking);
  trackedVideo?.removeEventListener("seeked", handleSeeked);

  trackedVideo = currentVideo;
  customSpeedMenu = currentVideo ? createCustomSpeedMenu(currentVideo) : null;

  currentVideo?.addEventListener("ratechange", handlePlaybackRateChange);
  currentVideo?.addEventListener("play", handlePlay);
  currentVideo?.addEventListener("pause", handlePause);
  currentVideo?.addEventListener("seeking", handleSeeking);
  currentVideo?.addEventListener("seeked", handleSeeked);
}

function mountCustomSpeedMenu(container: HTMLDivElement | null) {
  if (!container || !customSpeedMenu) return;

  const customMenuElement = customSpeedMenu.element;
  if (customMenuElement.parentElement === container) return;

  const nativeMenuContent = container.lastElementChild;

  if (nativeMenuContent instanceof HTMLElement) {
    nativeMenuContent.style.display = "none";
  }

  container.appendChild(customMenuElement);
}

function syncPlayerControls() {
  trackVideo(getVideo());

  playbackSpeedTrigger = getPlaybackSpeedMenuTrigger();
  syncPlaybackSpeed();
  rewindButton = getRewindButton();
  forwardButton = getForwardButton();

  mountCustomSpeedMenu(getPlaybackSpeedMenu());
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
  )
    return;

  const target = event.target;

  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select"))
  )
    return;

  let button: HTMLButtonElement | null = null;

  if (key === "j") {
    button = rewindButton;
  } else {
    button = forwardButton;
  }

  if (!button || !button.isConnected || button.disabled) return;

  event.preventDefault();
  button.click();
}

window.addEventListener("keydown", handleSeekKeydown);
