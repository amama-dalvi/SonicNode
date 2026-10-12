// Quietly music library — local files stay in this browser session.
class Song {
  constructor(file) {
    this.file = file;
    this.title = file.name.replace(/\.[^/.]+$/, "");
    this.artist = "Local audio file";
    this.album = "On this device";
    this.prev = null;
    this.next = null;
    this.url = URL.createObjectURL(file);
    this.duration = 0;
    this.favorite = false;

    this.id = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  }
}

let head = null,
  tail = null,
  currentSong = null,
  selectedSong = null;
let songCount = 0,
  shuffleOn = false,
  repeatMode = 0,
  activeView = "home";
let activePlaylistId = null,
  nextPlaylistId = 1;
const playlists = [];
let shuffleQueue = [];
let playHistory = [];
let sortMode = "added";
let toastTimer;

const audio = document.getElementById("audioPlayer");
const songPicker = document.getElementById("songPicker");
const songList = document.getElementById("songList");
const listVisual = document.getElementById("listVisual");
const playlistDialog = document.getElementById("playlistDialog");
const queueDialog = document.getElementById("queueDialog");

function getSongs() {
  const songs = [];
  for (let song = head; song; song = song.next) songs.push(song);
  return songs;
}
function getActiveSongs() {
  // The Playlists overview shows playlist cards only; tracks appear after a playlist is opened.
  if (activeView === "playlists" && activePlaylistId === null) return [];

  if (activeView === "favorites" && activePlaylistId === null) {
    return getSongs().filter((song) => song.favorite);
  }

  if (activeView === "recent" && activePlaylistId === null) {
    const byId = new Map(getSongs().map((song) => [song.id, song]));
    return playHistory.map((id) => byId.get(id)).filter(Boolean);
  }

  if (activePlaylistId !== null) {
    const playlist = playlists.find((p) => p.id === activePlaylistId);
    return playlist
      ? playlist.songIds
          .map((id) => getSongs().find((song) => song.id === id))
          .filter(Boolean)
      : [];
  }
  return getSongs();
}
function addSong(file) {
  if (!file || !file.type.startsWith("audio/")) return;
  const song = new Song(file);
  if (!head) head = tail = song;
  else {
    tail.next = song;
    song.prev = tail;
    tail = song;
  }
  songCount++;
  if (!selectedSong) selectedSong = song;

  // Importing music while a playlist is open adds it to that playlist too.
  // The song remains in the main linked-list library, but other playlists stay unchanged.
  if (activePlaylistId !== null) {
    const activePlaylist = playlists.find(
      (playlist) => playlist.id === activePlaylistId,
    );
    if (activePlaylist) addToPlaylist(activePlaylist, song);
  }

  // Read duration without changing the main player.
  const probe = new Audio();
  probe.preload = "metadata";
  probe.src = song.url;
  probe.addEventListener(
    "loadedmetadata",
    () => {
      song.duration = probe.duration || 0;
      if (currentSong === song) updateTimes();
      render();
    },
    { once: true },
  );
  render();
}
function addToPlaylist(playlist, song) {
  if (!playlist.songIds.includes(song.id)) playlist.songIds.push(song.id);
}
function removeFromPlaylist(song) {
  playlists.forEach(
    (p) => (p.songIds = p.songIds.filter((id) => id !== song.id)),
  );
}
function escapeText(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function render() {
  renderNavigation();
  renderSongs();
  renderPlaylists();
  renderList();
  updatePlayer();
}
function renderNavigation() {
  const nav = document.getElementById("playlistNav");
  nav.innerHTML = "";
  playlists.forEach((playlist) => {
    const button = document.createElement("button");
    button.className =
      "playlist-nav-item" + (activePlaylistId === playlist.id ? " active" : "");
    button.innerHTML = `<span class="playlist-swatch">♫</span><span class="playlist-nav-label">${escapeText(playlist.name)}</span>`;
    button.addEventListener("click", () => openPlaylist(playlist.id));
    nav.appendChild(button);
  });
  document.querySelectorAll(".nav-link[data-view]").forEach((button) => {
    button.classList.toggle("active", activeView === button.dataset.view);
  });
  const title = document.getElementById("pageTitle");
  const crumb = document.getElementById("viewCrumb");
  const subtitle = document.getElementById("pageSubtitle");
  const collection = document.getElementById("collectionTitle");
  if (activePlaylistId !== null) {
    const playlist = playlists.find((p) => p.id === activePlaylistId);
    title.textContent = playlist ? playlist.name : "Playlist";
    crumb.textContent = "Playlists";
    subtitle.textContent = "A collection of tracks picked by you.";
    collection.textContent = "Playlist tracks";
  } else if (activeView === "playlists") {
    title.textContent = "Your playlists";
    crumb.textContent = "Playlists";
    subtitle.textContent = "Little collections for every mood and moment.";
    collection.textContent = "Choose a playlist";
  } else if (activeView === "favorites") {
    title.textContent = "Liked songs";
    crumb.textContent = "Your library";
    subtitle.textContent = "The tracks you want to keep close.";
    collection.textContent = "Your favourites";
  } else if (activeView === "recent") {
    title.textContent = "Recently played";
    crumb.textContent = "Your library";
    subtitle.textContent = "Pick up where your listening took you.";
    collection.textContent = "Your listening history";
  } else {
    title.textContent = "Make room for good music.";
    crumb.textContent = "Home";
    subtitle.textContent =
      "Pick a track, settle in, and let the day slow down.";
    collection.textContent = "Recently added";
  }
}
function renderSongs() {
  const filter = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const all = getActiveSongs();
  const songs = all.filter(
    (song) =>
      song.title.toLowerCase().includes(filter) ||
      song.artist.toLowerCase().includes(filter),
  );

  if (sortMode === "title-asc")
    songs.sort((a, b) => a.title.localeCompare(b.title));
  if (sortMode === "title-desc")
    songs.sort((a, b) => b.title.localeCompare(a.title));
  if (sortMode === "duration-asc")
    songs.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  if (sortMode === "duration-desc")
    songs.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  songList.innerHTML = "";
  songs.forEach((song, index) => {
    const row = document.createElement("div");
    row.className =
      "song-row" +
      (song === selectedSong ? " selected" : "") +
      (song === currentSong ? " is-playing" : "");
    row.innerHTML = `
      <span class="row-number">${song === currentSong ? "♫" : String(index + 1).padStart(2, "0")}</span>
      <div class="song-meta"><button class="row-play" title="Play track" aria-label="Play ${escapeText(song.title)}">${song === currentSong && !audio.paused ? "Ⅱ" : "▶"}</button><span class="track-thumb">♫</span><div class="song-text"><span class="song-title" title="${escapeText(song.title)}">${escapeText(song.title)}</span><span class="song-artist">${escapeText(song.artist)}</span></div></div>
      <span class="song-album">${escapeText(song.album)}</span>
      <span class="song-duration">${formatTime(song.duration)}</span>
      <span class="song-actions"><button class="add-to-playlist" title="Add to playlist" aria-label="Add ${escapeText(song.title)} to a playlist">＋</button><button class="delete-one" title="Remove track" aria-label="Remove ${escapeText(song.title)}">×</button></span>`;
    row
      .querySelector(".row-play")
      .addEventListener("click", () => playSong(song));
    row.querySelector(".song-meta").addEventListener("click", (event) => {
      if (!event.target.closest("button")) {
        selectedSong = song;
        render();
      }
    });
    row
      .querySelector(".delete-one")
      .addEventListener("click", () => deleteSong(song));
    row
      .querySelector(".add-to-playlist")
      .addEventListener("click", () => addSongToChosenPlaylist(song));
    songList.appendChild(row);
  });
  const empty = document.getElementById("emptyState");
  empty.style.display = songs.length ? "none" : "block";
  if (activeView === "playlists" && activePlaylistId === null) {
    empty.querySelector("h3").textContent = playlists.length
      ? "Choose a playlist to get started."
      : "Your playlists will appear here.";
    empty.querySelector("p").textContent = playlists.length
      ? "Select one of your playlists above or from the sidebar to see only its songs."
      : "Create a playlist, then open it to add and manage its songs.";
    document.getElementById("emptyAddBtn").style.display = "none";
  } else if (!getSongs().length) {
    empty.querySelector("h3").textContent = "Your library is waiting.";
    empty.querySelector("p").textContent =
      "Add a few audio files from your computer to get started.";
    document.getElementById("emptyAddBtn").style.display = "inline-block";
  } else if (activePlaylistId !== null && !all.length) {
    empty.querySelector("h3").textContent = "This playlist is still empty.";
    empty.querySelector("p").textContent =
      "Use “Add music” above to import songs directly into this playlist.";
    document.getElementById("emptyAddBtn").style.display = "none";
  } else if (activeView === "favorites" && !all.length) {
    empty.querySelector("h3").textContent = "No liked songs yet.";
    empty.querySelector("p").textContent =
      "Tap the heart on a track while it plays to save it here.";
    document.getElementById("emptyAddBtn").style.display = "none";
  } else if (activeView === "recent" && !all.length) {
    empty.querySelector("h3").textContent = "Your listening history is empty.";
    empty.querySelector("p").textContent =
      "Play a song and it will appear here for quick access.";
    document.getElementById("emptyAddBtn").style.display = "none";
  } else {
    empty.querySelector("h3").textContent = "No matching tracks.";
    empty.querySelector("p").textContent =
      "Try another search or switch to a different collection.";
    document.getElementById("emptyAddBtn").style.display = "none";
  }
  document.getElementById("queueCount").textContent = getActiveSongs().length;
}
function renderPlaylists() {
  const cards = document.getElementById("playlistCards");
  const empty = document.getElementById("noPlaylists");
  cards.innerHTML = "";
  playlists.forEach((playlist, index) => {
    const count = playlist.songIds.length;
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.innerHTML = `<span class="playlist-cover">${["♫", "☾", "✦", "♬"][index % 4]}</span><button class="playlist-card-open" type="button" aria-label="Open ${escapeText(playlist.name)}"><span class="playlist-card-info"><strong>${escapeText(playlist.name)}</strong><span>${count} ${count === 1 ? "track" : "tracks"}</span></span><span class="playlist-arrow">›</span></button><span class="playlist-card-actions"><button class="playlist-rename" type="button" title="Rename playlist" aria-label="Rename ${escapeText(playlist.name)}">✎</button><button class="playlist-delete" type="button" title="Delete playlist" aria-label="Delete ${escapeText(playlist.name)}">×</button></span>`;
    card
      .querySelector(".playlist-card-open")
      .addEventListener("click", () => openPlaylist(playlist.id));
    card
      .querySelector(".playlist-rename")
      .addEventListener("click", () => managePlaylist(playlist.id, "rename"));
    card
      .querySelector(".playlist-delete")
      .addEventListener("click", () => managePlaylist(playlist.id, "delete"));
    cards.appendChild(card);
  });
  empty.style.display = playlists.length ? "none" : "block";
}
function renderList() {
  // Visualize only the current view's linked sequence: a single playlist when
  // one is open, the library on Home, and no combined sequence on the overview.
  const songs = getActiveSongs();
  listVisual.innerHTML = "";

  if (!songs.length) {
    listVisual.innerHTML =
      '<span class="null-node">NULL</span><span class="node-arrow">↔</span><span class="node">Empty list</span><span class="node-arrow">↔</span><span class="null-node">NULL</span>';
    return;
  }

  const addNull = (label) => {
    const el = document.createElement("span");
    el.className = "null-node";
    el.textContent = label;
    listVisual.appendChild(el);
  };

  addNull("NULL");
  songs.forEach((song, index) => {
    const wrap = document.createElement("div");
    wrap.className = "node-wrap";

    const node = document.createElement("button");
    node.className =
      "node" +
      (song === currentSong ? " current" : "") +
      (song === selectedSong ? " selected-node" : "");
    const previousSong = songs[index - 1] || null;
    const nextSong = songs[index + 1] || null;
    node.title = `Previous in this view: ${previousSong ? previousSong.title : "NULL"} | Current: ${song.title} | Next in this view: ${nextSong ? nextSong.title : "NULL"}`;
    node.innerHTML = `<span class="node-prev">${previousSong ? "←" : "NULL"}</span><span class="node-song">${escapeText(song.title)}</span><span class="node-next">${nextSong ? "→" : "NULL"}</span>`;
    node.addEventListener("click", () => {
      selectedSong = song;
      render();
      showToast(`Selected: ${song.title}`);
    });

    const play = document.createElement("button");
    play.className = "node-play";
    play.type = "button";
    play.title = `Play ${song.title}`;
    play.textContent = song === currentSong && !audio.paused ? "Ⅱ" : "▶";
    play.addEventListener("click", () => playSong(song));

    wrap.appendChild(node);
    wrap.appendChild(play);
    if (index < songs.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "node-arrow";
      arrow.innerHTML = "↔";
      wrap.appendChild(arrow);
    }
    listVisual.appendChild(wrap);
  });
  addNull("NULL");
}
function updatePlayer() {
  document.getElementById("mainPlay").textContent = audio.paused ? "▶" : "Ⅱ";
  document
    .querySelector(".player")
    .classList.toggle("is-playing", !!currentSong && !audio.paused);
  document
    .getElementById("playerArt")
    .classList.toggle("has-track", !!currentSong);
  document.getElementById("shuffleBtn").classList.toggle("active", shuffleOn);
  document
    .getElementById("shuffleAllBtn")
    .classList.toggle("active", shuffleOn);
  const repeat = document.getElementById("repeatBtn");
  repeat.classList.toggle("active", repeatMode > 0);
  repeat.title =
    repeatMode === 0
      ? "Repeat off"
      : repeatMode === 1
        ? "Repeat all"
        : "Repeat current track";
  repeat.setAttribute("aria-label", repeat.title);
  document.getElementById("favoriteBtn").textContent = currentSong?.favorite
    ? "♥"
    : "♡";
  document
    .getElementById("favoriteBtn")
    .classList.toggle("favorited", !!currentSong?.favorite);
  if (currentSong) {
    document.getElementById("nowTitle").textContent = currentSong.title;
    document.getElementById("nowArtist").textContent = currentSong.artist;
  } else {
    document.getElementById("nowTitle").textContent = "Nothing playing yet";
    document.getElementById("nowArtist").textContent =
      "Choose a track from your library";
  }
}
function playSong(song) {
  if (!song) {
    showToast("Add some music first.");
    return;
  }
  currentSong = selectedSong = song;
  playHistory = [song.id, ...playHistory.filter((id) => id !== song.id)].slice(
    0,
    50,
  );
  if (audio.src !== song.url) audio.src = song.url;
  audio
    .play()
    .then(() => {
      render();
    })
    .catch(() =>
      showToast(
        "Couldn't play this file. Try an MP3, WAV, or supported audio file.",
      ),
    );
  render();
}
function deleteSong(song) {
  if (!song) return;
  if (song.prev) song.prev.next = song.next;
  else head = song.next;
  if (song.next) song.next.prev = song.prev;
  else tail = song.prev;
  if (currentSong === song) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    currentSong = null;
    document.getElementById("progress").value = 0;
    document.getElementById("currentTime").textContent = "0:00";
    document.getElementById("totalTime").textContent = "0:00";
  }
  if (selectedSong === song) selectedSong = song.next || song.prev || null;
  URL.revokeObjectURL(song.url);
  songCount--;
  removeFromPlaylist(song);
  shuffleQueue = shuffleQueue.filter((item) => item !== song);
  render();
  showToast("Track removed from your library.");
}
function buildShuffleQueue(pool, excludeCurrent = true) {
  shuffleQueue = pool.filter(
    (song) => !(excludeCurrent && song === currentSong),
  );
  for (let i = shuffleQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
  }
}
function playNext(direction) {
  // Navigate within the visible collection/playlist when possible.
  const pool = getActiveSongs();
  if (!pool.length) {
    showToast("This collection has no tracks yet.");
    return;
  }

  if (!currentSong || !pool.some((song) => song.id === currentSong.id)) {
    const first =
      direction === "prev"
        ? pool[pool.length - 1]
        : shuffleOn
          ? randomSong(pool)
          : pool[0];
    playSong(first);
    return;
  }

  if (direction === "next" && repeatMode === 2) {
    playSong(currentSong);
    return;
  }

  let target = null;

  if (shuffleOn) {
    if (direction === "next") {
      if (!shuffleQueue.length) {
        if (repeatMode === 1) buildShuffleQueue(pool);
        else {
          // At the end of a shuffled queue, start a fresh cycle for a friendlier UX.
          buildShuffleQueue(pool);
          if (!shuffleQueue.length && pool.length === 1) {
            playSong(pool[0]);
            return;
          }
        }
      }
      target = shuffleQueue.shift() || null;
      if (!target && pool.length > 1) {
        const candidates = pool.filter((song) => song.id !== currentSong.id);
        target = randomSong(candidates);
      }
    } else {
      // Previous in shuffle mode goes to a different random track.
      const candidates = pool.filter((song) => song.id !== currentSong.id);
      target = candidates.length ? randomSong(candidates) : currentSong;
    }
  } else {
    const index = pool.findIndex((song) => song.id === currentSong.id);
    if (direction === "next") {
      if (index < pool.length - 1) target = pool[index + 1];
      else if (repeatMode === 1) target = pool[0];
    } else {
      if (index > 0) target = pool[index - 1];
      else if (repeatMode === 1) target = pool[pool.length - 1];
    }
  }

  if (target) {
    playSong(target);
  } else if (direction === "next") {
    audio.pause();
    showToast("End of playlist.");
  } else {
    showToast("You're at the first track.");
  }
}
function randomSong(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}
function toggleShuffle() {
  shuffleOn = !shuffleOn;
  buildShuffleQueue(getActiveSongs());
  updatePlayer();
  showToast(shuffleOn ? "Shuffle is on." : "Shuffle is off.");
}
function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  updatePlayer();
  showToast(
    ["Repeat is off.", "Repeat all is on.", "Repeat current track is on."][
      repeatMode
    ],
  );
}
let playlistDialogMode = "create";
let playlistBeingManaged = null;

function openPlaylistDialog(mode, playlist = null) {
  playlistDialogMode = mode;
  playlistBeingManaged = playlist;
  const title = document.getElementById("playlistDialogTitle");
  const eyebrow = document.getElementById("playlistDialogEyebrow");
  const copy = document.getElementById("playlistDialogCopy");
  const label = document.getElementById("playlistNameLabel");
  const input = document.getElementById("playlistName");
  const confirm = document.getElementById("confirmPlaylist");
  const error = document.getElementById("playlistFormError");
  const isDelete = mode === "delete";
  const isRename = mode === "rename";
  eyebrow.textContent = isDelete
    ? "PLAYLIST SETTINGS"
    : isRename
      ? "PLAYLIST SETTINGS"
      : "MAKE IT YOURS";
  title.textContent = isDelete
    ? "Delete this playlist?"
    : isRename
      ? "Rename playlist"
      : "Create a playlist";
  copy.textContent = isDelete
    ? `“${playlist.name}” will be removed from your playlists. Your music library and audio files will not be deleted.`
    : isRename
      ? "Choose a new name for this playlist."
      : "Give this little collection a name.";
  label.hidden = isDelete;
  input.hidden = isDelete;
  input.value = isRename ? playlist.name : "";
  input.placeholder = "e.g. Slow mornings";
  confirm.textContent = isDelete
    ? "Delete playlist"
    : isRename
      ? "Save name"
      : "Create playlist";
  confirm.classList.toggle("btn-danger", isDelete);
  error.hidden = true;
  error.textContent = "";
  document
    .getElementById("playlistForm")
    .classList.toggle("delete-mode", isDelete);
  if (!playlistDialog.open) playlistDialog.showModal();
  if (!isDelete) setTimeout(() => input.focus(), 0);
  else confirm.focus();
}

function managePlaylist(id, mode = "rename") {
  const playlist = playlists.find((item) => item.id === id);
  if (playlist) openPlaylistDialog(mode, playlist);
}

function closePlaylistDialog() {
  if (playlistDialog.open) playlistDialog.close();
  playlistBeingManaged = null;
  document.getElementById("playlistFormError").hidden = true;
}

function submitPlaylistDialog(event) {
  event.preventDefault();
  const input = document.getElementById("playlistName");
  const error = document.getElementById("playlistFormError");
  if (playlistDialogMode === "delete") {
    const playlist = playlistBeingManaged;
    if (!playlist) return closePlaylistDialog();
    const index = playlists.findIndex((item) => item.id === playlist.id);
    if (index >= 0) playlists.splice(index, 1);
    if (activePlaylistId === playlist.id) {
      activePlaylistId = null;
      activeView = "playlists";
    }
    closePlaylistDialog();
    render();
    showToast(`Deleted “${playlist.name}”.`);
    return;
  }

  const name = input.value.trim();
  if (!name) {
    error.textContent = "Please enter a playlist name.";
    error.hidden = false;
    input.focus();
    return;
  }
  const duplicate = playlists.some(
    (item) =>
      item.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
      !(
        playlistDialogMode === "rename" && item.id === playlistBeingManaged?.id
      ),
  );
  if (duplicate) {
    error.textContent = "A playlist with this name already exists.";
    error.hidden = false;
    input.focus();
    return;
  }

  if (playlistDialogMode === "rename") {
    if (!playlistBeingManaged) return closePlaylistDialog();
    playlistBeingManaged.name = name;
    closePlaylistDialog();
    render();
    showToast(`Playlist renamed to “${name}”.`);
  } else {
    const playlist = { id: nextPlaylistId++, name, songIds: [] };
    playlists.push(playlist);
    closePlaylistDialog();
    activePlaylistId = playlist.id;
    activeView = "playlists";
    render();
    showToast(`Created “${name}”. Add music using the Add music button.`);
  }
}

function openPlaylist(id) {
  activePlaylistId = id;
  activeView = "playlists";
  document.getElementById("searchInput").value = "";
  render();
}
function showView(view) {
  activeView = view;
  activePlaylistId = null;
  document.getElementById("searchInput").value = "";
  render();
}
function createPlaylist() {
  openPlaylistDialog("create");
}
function addSongToChosenPlaylist(song) {
  if (!playlists.length) {
    showToast("Create a playlist first.");
    createPlaylist();
    return;
  }
  const options = playlists
    .map((playlist, index) => `${index + 1}. ${playlist.name}`)
    .join("\\n");
  const answer = prompt(
    `Add “${song.title}” to which playlist? Enter its number:\\n\\n${options}`,
  );
  if (answer === null || !answer.trim()) return;
  const index = Number.parseInt(answer, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= playlists.length) {
    showToast("That playlist number isn't valid.");
    return;
  }
  const playlist = playlists[index];
  if (playlist.songIds.includes(song.id))
    showToast("That track is already in this playlist.");
  else {
    addToPlaylist(playlist, song);
    render();
    showToast(`Added to “${playlist.name}”.`);
  }
}
function showQueue() {
  const queue = document.getElementById("queueList");
  const songs = getActiveSongs();
  queue.innerHTML = "";
  if (!songs.length)
    queue.innerHTML =
      '<p class="subtle-empty">Add songs to see your listening queue.</p>';
  songs.forEach((song, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "queue-item" + (song === currentSong ? " current" : "");
    button.innerHTML = `<span>${song === currentSong ? "♫" : String(index + 1).padStart(2, "0")} &nbsp; ${escapeText(song.title)}</span><small>${formatTime(song.duration)}</small>`;
    button.addEventListener("click", () => {
      queueDialog.close();
      playSong(song);
    });
    queue.appendChild(button);
  });
  queueDialog.showModal();
}
function updateTimes() {
  document.getElementById("currentTime").textContent = formatTime(
    audio.currentTime,
  );
  document.getElementById("totalTime").textContent = formatTime(audio.duration);
  document.getElementById("progress").value =
    Number.isFinite(audio.duration) && audio.duration > 0
      ? (audio.currentTime / audio.duration) * 100
      : 0;
}

document
  .getElementById("addSongBtn")
  .addEventListener("click", () => songPicker.click());
document
  .getElementById("emptyAddBtn")
  .addEventListener("click", () => songPicker.click());
songPicker.addEventListener("change", () => {
  const files = Array.from(songPicker.files);
  const addingToPlaylist = activePlaylistId !== null;
  files.forEach(addSong);
  songPicker.value = "";
  if (files.length) {
    showToast(
      addingToPlaylist
        ? `Added ${files.length} song${files.length === 1 ? "" : "s"} to this playlist and your library.`
        : `Added ${files.length} song${files.length === 1 ? "" : "s"} to your library.`,
    );
  }
});
document.getElementById("searchInput").addEventListener("input", renderSongs);
document.getElementById("sortSelect").addEventListener("change", (event) => {
  sortMode = event.target.value;
  renderSongs();
});

// Drag audio files onto the track panel to import them quickly.
const trackPanel = document.getElementById("trackPanel");
["dragenter", "dragover"].forEach((type) => {
  trackPanel.addEventListener(type, (event) => {
    event.preventDefault();
    trackPanel.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach((type) => {
  trackPanel.addEventListener(type, (event) => {
    event.preventDefault();
    if (type === "drop") {
      const files = Array.from(event.dataTransfer.files || []);
      const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
      const addingToPlaylist = activePlaylistId !== null;
      audioFiles.forEach(addSong);
      if (audioFiles.length)
        showToast(
          addingToPlaylist
            ? `Added ${audioFiles.length} audio file${audioFiles.length === 1 ? "" : "s"} to this playlist and your library.`
            : `Added ${audioFiles.length} audio file${audioFiles.length === 1 ? "" : "s"} to your library.`,
        );
      else showToast("Drop audio files to add music.");
    }
    trackPanel.classList.remove("drag-over");
  });
});
document
  .getElementById("createPlaylistBtn")
  .addEventListener("click", createPlaylist);
document
  .getElementById("sidebarCreate")
  .addEventListener("click", createPlaylist);
document
  .getElementById("panelCreate")
  .addEventListener("click", createPlaylist);
document
  .getElementById("playlistForm")
  .addEventListener("submit", submitPlaylistDialog);
document
  .getElementById("closePlaylistDialog")
  .addEventListener("click", closePlaylistDialog);
document
  .getElementById("cancelPlaylistDialog")
  .addEventListener("click", closePlaylistDialog);
playlistDialog.addEventListener("click", (event) => {
  if (event.target === playlistDialog) closePlaylistDialog();
});
playlistDialog.addEventListener("close", () => {
  playlistBeingManaged = null;
});
document.getElementById("playlistName").addEventListener("input", () => {
  document.getElementById("playlistFormError").hidden = true;
});
document
  .querySelectorAll(".nav-link[data-view]")
  .forEach((button) =>
    button.addEventListener("click", () => showView(button.dataset.view)),
  );
document.getElementById("mainPlay").addEventListener("click", () => {
  if (audio.paused)
    currentSong
      ? audio.play().catch(() => showToast("Couldn't play this track."))
      : playSong(selectedSong || getActiveSongs()[0] || head);
  else audio.pause();
});
document
  .getElementById("playerNext")
  .addEventListener("click", () => playNext("next"));
document
  .getElementById("playerPrev")
  .addEventListener("click", () => playNext("prev"));
document.getElementById("shuffleBtn").addEventListener("click", toggleShuffle);
document.getElementById("shuffleAllBtn").addEventListener("click", () => {
  if (!shuffleOn) toggleShuffle();
  const pool = getActiveSongs();
  if (pool.length) {
    if (!currentSong || !pool.includes(currentSong)) playSong(randomSong(pool));
    else playNext("next");
  } else showToast("Add some tracks to shuffle.");
});
document.getElementById("repeatBtn").addEventListener("click", toggleRepeat);
document.getElementById("favoriteBtn").addEventListener("click", () => {
  if (!currentSong) {
    showToast("Play a track to favourite it.");
    return;
  }
  currentSong.favorite = !currentSong.favorite;
  updatePlayer();
  renderSongs();
  renderList();
  showToast(
    currentSong.favorite ? "Added to favourites." : "Removed from favourites.",
  );
});
document.getElementById("heroPlay").addEventListener("click", () => {
  const pool = getActiveSongs();
  if (pool.length)
    playSong(currentSong && pool.includes(currentSong) ? currentSong : pool[0]);
  else songPicker.click();
});
document.getElementById("queueBtn").addEventListener("click", showQueue);
document
  .getElementById("volume")
  .addEventListener(
    "input",
    (event) => (audio.volume = Number(event.target.value)),
  );
document.getElementById("progress").addEventListener("input", (event) => {
  if (Number.isFinite(audio.duration) && audio.duration > 0)
    audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
});
audio.addEventListener("timeupdate", updateTimes);
audio.addEventListener("loadedmetadata", updateTimes);
audio.addEventListener("play", () => {
  updatePlayer();
  renderSongs();
  renderList();
});
audio.addEventListener("pause", () => {
  updatePlayer();
  renderSongs();
  renderList();
});
audio.addEventListener("ended", () => {
  if (repeatMode === 2 && currentSong) {
    audio.currentTime = 0;
    audio.play();
  } else playNext("next");
});
document.addEventListener("keydown", (event) => {
  if (
    event.target.matches("input,textarea") ||
    playlistDialog.open ||
    queueDialog.open
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    document.getElementById("mainPlay").click();
  }
  if (event.code === "ArrowRight" && event.altKey) playNext("next");
  if (event.code === "ArrowLeft" && event.altKey) playNext("prev");
});
audio.volume = 0.75;
render();
