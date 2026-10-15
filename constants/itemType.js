// Works out what a home-feed item IS from its own fields, instead of from the
// name of the section it came in (section names change on every fetch).
//

export const ITEM_TYPES = {
    SONG: "song",
    ALBUM: "album",
    PLAYLIST: "playlist",
    CUSTOM_PLAYLIST: "custom_playlist",
    UNKNOWN: "unknown",
};

const ALBUM_KINDS = ["album", "ep", "single"];

export const getItemType = (item) => {
    if (!item || typeof item !== "object") return ITEM_TYPES.UNKNOWN;

    // Playlists created inside this app carry their own songs / visibility flag
    const visibility = String(item.type || "").toLowerCase();
    if (
        Array.isArray(item.songs) ||
        visibility === "public" ||
        visibility === "private"
    ) {
        return ITEM_TYPES.CUSTOM_PLAYLIST;
    }

    // Songs are checked first on purpose: a song can also carry a playlistId
    // (its "radio" playlist), so playlistId alone must not mean "playlist".
    if (item.videoId || item.songId) return ITEM_TYPES.SONG;

    if (item.albumId) return ITEM_TYPES.ALBUM;
    if (item.playlistId) return ITEM_TYPES.PLAYLIST;

    // An explicit type label, if the API sends one
    if (ALBUM_KINDS.includes(visibility)) return ITEM_TYPES.ALBUM;
    if (visibility === "playlist") return ITEM_TYPES.PLAYLIST;

    // Last resort: the usual id prefixes of a browseId
    const browseId = String(item.browseId || "");
    if (browseId.startsWith("MPRE")) return ITEM_TYPES.ALBUM;
    if (/^(VL|PL|RD|OLAK)/.test(browseId)) return ITEM_TYPES.PLAYLIST;

    return ITEM_TYPES.UNKNOWN;
};

// A section's type is the type of its first item. Anything that isn't a list
// (e.g. an object) or whose items aren't songs/albums/playlists is UNKNOWN,
// which is how charts, moods and genres get skipped without naming them.
export const getSectionType = (list) =>
    Array.isArray(list) && list.length > 0
        ? getItemType(list[0])
        : ITEM_TYPES.UNKNOWN;

// The rest of the app reads `videoId`; accept `songId` too.
export const withVideoId = (song) =>
    song && !song.videoId && song.songId ? { ...song, videoId: song.songId } : song;