console.log("[CAC] Content script loaded");

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = (typeof SPEEDS)[number];

function getVideo() {
  return document.querySelector<HTMLVideoElement>("video");
}

function getPlaybackMenuButton() {
  return document.querySelector<HTMLButtonElement>(
    'button[aria-label="Playback Speed Menu"]',
  );
}

function getPlaybackMenu() {
  return document.querySelector<HTMLDivElement>(
    'div[role="menu"][aria-label="Playback Speed"]',
  );
}

function setPlaybackSpeed(video: HTMLVideoElement, speed: Speed) {
  video.playbackRate = speed;
}

function createPlaybackMenu(video: HTMLVideoElement) {
  const menu = document.createElement("div");
  menu.className = "kat:overflow-y-auto kat:max-h-468";

  const items = SPEEDS.map((speed) => {
    const { element, setActive } = createPlaybackMenuItem(video, speed);
    return { speed, element, setActive };
  });

  items.forEach(({ element }) => menu.appendChild(element));

  function updateActiveState() {
    const currentSpeed = video.playbackRate;

    items.forEach(({ speed, setActive }) => {
      setActive(speed === currentSpeed);
    });
  }

  updateActiveState();

  return { menu, updateActiveState };
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

function createPlaybackMenuItem(video: HTMLVideoElement, speed: Speed) {
  const item = document.createElement("div");
  item.role = "menuitemradio";
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

let currentVideo: HTMLVideoElement | null = null;
let playbackMenu: ReturnType<typeof createPlaybackMenu> | null = null;
let playbackMenuButton: HTMLButtonElement | null = null;

function updatePlaybackMenuButtonText() {
  if (!currentVideo || !playbackMenuButton) return;

  const text = `${currentVideo.playbackRate}x`;

  if (playbackMenuButton.textContent !== text) {
    playbackMenuButton.textContent = text;
  }
}

function onRateChange() {
  updatePlaybackMenuButtonText();
  playbackMenu?.updateActiveState();
}

function syncPlayerControls() {
  const video = getVideo();
  const button = getPlaybackMenuButton();

  if (video !== currentVideo) {
    currentVideo?.removeEventListener("ratechange", onRateChange);
    currentVideo = video;
    playbackMenu = video ? createPlaybackMenu(video) : null;
    video?.addEventListener("ratechange", onRateChange);
  }

  playbackMenuButton = button;
  updatePlaybackMenuButtonText();

  const menu = getPlaybackMenu();

  if (!menu || !playbackMenu || playbackMenu.menu.parentElement === menu) {
    return;
  }

  const originalMenu = menu.lastElementChild;

  if (originalMenu instanceof HTMLElement) {
    originalMenu.style.display = "none";
  }

  menu.appendChild(playbackMenu.menu);
}

const observer = new MutationObserver(syncPlayerControls);

observer.observe(document.body, {
  subtree: true,
  childList: true,
});

syncPlayerControls();
