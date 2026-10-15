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

function setPlaybackSpeed(speed: Speed) {
  if (!cachedVideo) return;

  cachedVideo.playbackRate = speed;
  globalPlaybackSpeed = speed;
  localStorage.setItem("playbackRate", `${speed}`);
}

function createPlaybackMenuItem(speed: Speed) {
  const item = document.createElement("div");
  item.role = "menuitemradio";
  item.tabIndex = 0;
  item.className =
    "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500";

  item.addEventListener("click", (event) => {
    event.preventDefault();
    setPlaybackSpeed(speed);
    cachedPlaybackMenuTrigger?.click();
  });
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setPlaybackSpeed(speed);
      cachedPlaybackMenuTrigger?.click();
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

function createCustomPlaybackMenu() {
  const menu = document.createElement("div");
  menu.className = "kat:overflow-y-auto kat:max-h-468";

  const items = SPEEDS.map((speed) => {
    const { element, setActive } = createPlaybackMenuItem(speed);
    return { speed, element, setActive };
  });

  items.forEach(({ element }) => menu.appendChild(element));

  function refreshSelection() {
    const currentSpeed = cachedVideo?.playbackRate;

    items.forEach(({ speed, setActive }) => {
      setActive(speed === currentSpeed);
    });
  }

  refreshSelection();

  return { element: menu, refreshSelection };
}

let cachedVideo: HTMLVideoElement | null = null;
let cachedPlaybackMenuTrigger: HTMLButtonElement | null = null;
const customPlaybackMenu = createCustomPlaybackMenu();

const savedSpeed = Number(localStorage.getItem("playbackRate"));
let globalPlaybackSpeed = SPEEDS.find((speed) => speed === savedSpeed) ?? 1;

function updatePlaybackMenuTriggerLabel() {
  if (!cachedVideo || !cachedPlaybackMenuTrigger) return;

  const text = `${cachedVideo.playbackRate}x`;

  if (cachedPlaybackMenuTrigger.textContent !== text) {
    cachedPlaybackMenuTrigger.textContent = text;
  }
}

function syncPlaybackSpeed() {
  if (!cachedVideo) return;

  if (cachedVideo.playbackRate !== globalPlaybackSpeed) {
    cachedVideo.playbackRate = globalPlaybackSpeed;
  }

  updatePlaybackMenuTriggerLabel();
  customPlaybackMenu.refreshSelection();
}

function updateVideo(video: HTMLVideoElement | null) {
  if (video === cachedVideo) return;

  if (cachedVideo) {
    cachedVideo.removeEventListener("ratechange", syncPlaybackSpeed);
    cachedVideo.removeEventListener("play", syncPlaybackSpeed);
    cachedVideo.removeEventListener("pause", syncPlaybackSpeed);
    cachedVideo.removeEventListener("seeking", syncPlaybackSpeed);
    cachedVideo.removeEventListener("seeked", syncPlaybackSpeed);
  }

  cachedVideo = video;

  if (video) {
    video.addEventListener("ratechange", syncPlaybackSpeed);
    video.addEventListener("play", syncPlaybackSpeed);
    video.addEventListener("pause", syncPlaybackSpeed);
    video.addEventListener("seeking", syncPlaybackSpeed);
    video.addEventListener("seeked", syncPlaybackSpeed);
    // Updates the new video to the global playback speed
    syncPlaybackSpeed();
  } else {
    // If video is null we refresh the selection so that it clears the selected option
    customPlaybackMenu.refreshSelection();
  }
}

function updatePlaybackMenuTrigger(trigger: HTMLButtonElement | null) {
  cachedPlaybackMenuTrigger = trigger;
  updatePlaybackMenuTriggerLabel();
}

function mountCustomPlaybackMenu(menu: HTMLDivElement | null) {
  if (menu && customPlaybackMenu.element.parentElement !== menu) {
    const content = menu.lastElementChild;

    if (content instanceof HTMLElement) {
      content.style.display = "none";
    }

    menu.appendChild(customPlaybackMenu.element);
  }
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

// function handleSeekKeydown(event: KeyboardEvent) {
//   const key = event.key.toLowerCase();

//   if (key !== "j" && key !== "l") return;

//   if (
//     event.defaultPrevented ||
//     event.ctrlKey ||
//     event.altKey ||
//     event.metaKey ||
//     event.isComposing
//   )
//     return;

//   const target = event.target;

//   if (
//     target instanceof HTMLElement &&
//     (target.isContentEditable || target.closest("input, textarea, select"))
//   )
//     return;

//   let button: HTMLButtonElement | null = null;

//   if (key === "j") {
//     button = rewindButton;
//   } else {
//     button = forwardButton;
//   }

//   if (!button || !button.isConnected || button.disabled) return;

//   event.preventDefault();
//   button.click();
// }

// window.addEventListener("keydown", handleSeekKeydown);
