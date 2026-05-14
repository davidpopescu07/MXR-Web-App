const getApiBase = () => {
    const configuredBase = process.env.REACT_APP_API_URL?.trim();
    if (configuredBase) return configuredBase.replace(/\/$/, "");

    if (typeof window !== "undefined" && window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:3001/api`;
    }

    return "http://localhost:3001/api";
};

const BASE = getApiBase();

async function request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(`${BASE}${path}`, {
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
        body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
    });

    if (res.status === 204) return null;

    const data = await res.json();

    if (!res.ok) {
        const msg = data?.errors?.join(", ") || `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}


export const api = {
    getPlaylists: () => request("/playlists"),

    createPlaylist: (name) => request("/playlists", { method: "POST", body: { name } }),

    renamePlaylist: (name, newName) =>
        request(`/playlists/${encodeURIComponent(name)}`, { method: "PUT", body: { name: newName } }),

    deletePlaylist: (name) =>
        request(`/playlists/${encodeURIComponent(name)}`, { method: "DELETE" }),

    getTracks: (playlistName, { page = 1, limit = 5, search = "" } = {}) =>
        request(
            `/playlists/${encodeURIComponent(playlistName)}/tracks?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        ),

    getTrack: (playlistName, id) =>
        request(`/playlists/${encodeURIComponent(playlistName)}/tracks/${id}`),

    createTrack: (playlistName, track) =>
        request(`/playlists/${encodeURIComponent(playlistName)}/tracks`, {
            method: "POST",
            body: track,
        }),

    updateTrack: (playlistName, id, updates) =>
        request(`/playlists/${encodeURIComponent(playlistName)}/tracks/${id}`, {
            method: "PUT",
            body: updates,
        }),

    deleteTrack: (playlistName, id) =>
        request(`/playlists/${encodeURIComponent(playlistName)}/tracks/${id}`, {
            method: "DELETE",
        }),

    getStats: (playlistName) =>
        request(`/playlists/${encodeURIComponent(playlistName)}/stats`),
};
