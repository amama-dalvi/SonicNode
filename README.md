# 🎵 SonicNode — Music Playlist Manager

SonicNode is an interactive music library and playlist management application developed as part of a Data Structures and Algorithms (DSA) project. It demonstrates the practical implementation of a **Doubly Linked List** through a music player interface built using HTML, CSS, and JavaScript.

The project connects theoretical data structure concepts with a practical application, making it easier to understand how songs can be organised, navigated, added, and deleted using linked-list operations.

## ✨ Features

- **Music Library:** Add and manage audio files from your local device.
- **Music Playback:** Play, pause, and navigate between tracks.
- **Playlist Management:** Create, rename, and delete playlists.
- **Song Organisation:** Keep songs organised within individual playlists.
- **Doubly Linked List Visualisation:** View song nodes and understand their connections.
- **Forward and Backward Navigation:** Demonstrate movement through songs using `next` and `prev` references.
- **Interactive Interface:** A clean interface with playback controls and song information.
- **Playlist-Specific View:** Display the songs belonging to the selected playlist.

## 💻 Tech Stack

| HTML5 | Structures the application interface |
| CSS3 | Styles the interface and layouts |
| JavaScript | Implements application logic and data structures |
| Doubly Linked List | Manages song-node connections |
| Local Audio Files | Provides audio for playback |

## 🧠 Data Structure: Doubly Linked List

The core DSA concept used in SonicNode is a **Doubly Linked List**.

Each song is represented as a node containing song information and two references:

- `prev` — Points to the previous song.
- `next` — Points to the next song.

The list also maintains:

- `head` — References the first song.
- `tail` — References the last song.

### Visual Representation


HEAD
  |
  v
NULL <- [Song A] <-> [Song B] <-> [Song C] -> NULL
                                              ^
                                              |
                                             TAIL


This structure supports traversal in both directions.

### Core Operations


`addSong()` -> Adds a song to the music library |
`getSongs()` -> Traverses the list and retrieves songs |
`deleteSong()` -> Removes a song and updates the neighbouring links |
Forward traversal -> Moves through songs using `next` |
Backward traversal -> Moves through songs using `prev` |

### How Deletion Works

When a song is removed, the neighbouring nodes are reconnected so that the list remains consistent.

For example:


Before: [Song A] <-> [Song B] <-> [Song C]

Delete Song B

After:  [Song A] <-> [Song C]


The first and last pointers must also be updated when deleting the head or tail node.

## 🚀 Getting Started

You can run SonicNode locally without installing additional packages.

### Prerequisites

- A modern web browser such as Google Chrome, Microsoft Edge, or Firefox.
- Audio files stored on your device.

### Installation

**1. Clone the repository**


git clone https://github.com/amama-dalvi/SonicNode.git


**2. Open the project folder**

cd SonicNode

**3. Launch the application**

Open `index.html` in your browser.

You can also use the **Live Server** extension in Visual Studio Code for local development.

## 🎧 How to Use

1. Open SonicNode in your browser.
2. Add audio files from your device to the music library.
3. Use the playback controls to play, pause, and navigate between tracks.
4. Create playlists to organise your music.
5. Add songs to the appropriate playlists.
6. Rename or delete playlists when needed.
7. Explore the Doubly Linked List visualisation to understand how song nodes are connected.

## 📚 Learning Outcomes

Developing SonicNode helped reinforce the following concepts:

- Understanding the structure and behaviour of a Doubly Linked List.
- Implementing insertion and deletion operations.
- Maintaining `head`, `tail`, `prev`, and `next` references.
- Traversing linked lists.
- Connecting data structure concepts with a practical web application.
- Manipulating the DOM using JavaScript.
- Building an interactive interface using HTML and CSS.
- Separating songs in individual playlists.

## 🌍 Real-World Applications

The Doubly Linked List concept used in SonicNode can also be applied to:

- Browser history navigation.
- Previous and next image navigation in image viewers.
- Media player navigation.
- Undo and redo systems.
- Applications that require movement in both directions through sequential items.

## 🔮 Future Improvements

Potential enhancements include:

- Saving playlists and library data between sessions.
- Adding drag-and-drop playlist organisation.
- Improving playlist search and filtering.
- Adding song metadata and album artwork.
- Enhancing mobile responsiveness.
- Adding automated tests for linked-list operations.

## 👩‍💻 Author

**Amama Dalvi**

GitHub: [amama-dalvi](https://github.com/amama-dalvi)

Project Repository: [SonicNode](https://github.com/amama-dalvi/SonicNode)

## 🙌 Acknowledgements

This project was developed as part of a Data Structures and Algorithms learning project to demonstrate how fundamental computer science concepts can be applied to interactive applications.

---

⭐ If you find this project interesting, feel free to explore the repository and share your feedback!
