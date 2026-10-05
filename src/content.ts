console.log("[CAC] Content script loaded");

type Speed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

function getVideo() {
  return (
    document.querySelector<HTMLVideoElement>("video") ||
    document.querySelector<HTMLVideoElement>("video#bitmovinplayer-video-null")
  );
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
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

  const menu = document.createElement("div");
  menu.className = "kat:overflow-y-auto kat:max-h-468";

  const elements = speeds.map((speed) => createPlaybackMenuItem(video, speed));
  elements.forEach((element) => menu.appendChild(element));

  function updateActiveState() {
    const currentSpeed = video.playbackRate as Speed;
    elements.forEach((element, index) => {
      const speed = speeds[index];
      element.ariaChecked = speed === currentSpeed ? "true" : "false";
      element.className =
        speed === currentSpeed
          ? "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:bg-white/6 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500"
          : "kat:flex kat:items-center kat:gap-4 kat:cursor-pointer kat:transition-colors kat:select-none kat:ps-20 kat:pe-20 kat:pt-13 kat:pb-13 kat:hover:bg-neutral-600 kat:focus-visible:outline-4 kat:focus-visible:-outline-offset-4 kat:focus-visible:outline-orange-500 kat:focus-visible:bg-neutral-600 kat:active:bg-neutral-500";

      element.removeChild(element.lastElementChild!);

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "kat:w-24 kat:h-24 kat:shrink-0";

      if (speed === currentSpeed) {
        iconWrapper.innerHTML = `<svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="kat:text-white"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15.7929 8.29289L17.2071 9.70711L10.5 16.4142L6.79289 12.7071L8.20711 11.2929L10.5 13.5858L15.7929 8.29289Z"
                fill="currentColor"
              ></path>
            </svg>`;
      }

      element.appendChild(iconWrapper);
    });
  }

  updateActiveState();

  return { menu, updateActiveState };
}

function createPlaybackMenuItem(video: HTMLVideoElement, speed: Speed) {
  const item = document.createElement("div");
  item.role = "menuitemradio";
  item.ariaLabel = `${speed}x`;
  item.ariaDisabled = "false";
  item.tabIndex = 0;
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

let currentVideo: HTMLVideoElement | null = null;
let playbackMenu: ReturnType<typeof createPlaybackMenu> | null = null;
let playbackMenuButton: HTMLButtonElement | null = null;
let desiredText: string | null = null;

function onRateChange() {
  console.log("[CAC] Rate changed");
  if (currentVideo) {
    desiredText = `${currentVideo.playbackRate}x`;
  }

  if (desiredText !== null && playbackMenuButton) {
    playbackMenuButton.textContent = desiredText;
  }

  if (playbackMenu) {
    playbackMenu.updateActiveState();
  }
}

const observer = new MutationObserver(() => {
  const video = getVideo();
  const button = getPlaybackMenuButton();

  if (video !== currentVideo) {
    currentVideo?.removeEventListener("ratechange", onRateChange);
    currentVideo = video;
    playbackMenu = video ? createPlaybackMenu(video) : null;
    playbackMenuButton = button;
    video?.addEventListener("ratechange", onRateChange);
  }

  const menu = getPlaybackMenu();

  if (!menu || !playbackMenu || playbackMenu.menu.parentElement === menu) {
    return;
  }

  const originalMenu = menu.lastElementChild;

  if (originalMenu instanceof HTMLElement) {
    originalMenu.style.display = "none";
  }

  menu.appendChild(playbackMenu.menu);
});

observer.observe(document.body, {
  subtree: true,
  childList: true,
});
