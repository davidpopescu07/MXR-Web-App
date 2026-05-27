const getApiBase = () => {
    const configuredBase = process.env.REACT_APP_API_URL?.trim();
    const runtimeBase = typeof window !== "undefined" && window.location.hostname
        ? `${window.location.protocol}//${window.location.hostname}:3001/api`
        : "http://localhost:3001/api";

    const isLocalHost = (hostname) => ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
    const isPrivateLanHost = (hostname) =>
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
        /^192\.168\./.test(hostname);

    if (configuredBase) {
        try {
            const configuredUrl = new URL(configuredBase);
            const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "";
            const configuredIsLocal = isLocalHost(configuredUrl.hostname);
            const pageIsLan = isPrivateLanHost(runtimeHost);

            if (configuredIsLocal && pageIsLan) return runtimeBase;
            if (pageIsLan && configuredUrl.hostname !== runtimeHost) return runtimeBase;
        } catch {
            return configuredBase.replace(/\/$/, "");
        }

        return configuredBase.replace(/\/$/, "");
    }

    return runtimeBase;
};

const BASE = getApiBase();

async function request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    let res;
    try {
        res = await fetch(`${BASE}${path}`, {
            headers: isFormData ? undefined : { "Content-Type": "application/json" },
            credentials: "include",
            ...options,
            body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
        });
    } catch (err) {
        throw new Error(`Could not reach backend at ${BASE}. Check HTTPS trust, firewall, and current laptop IP.`);
    }

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = data?.errors?.join(", ") || `HTTP ${res.status}`;
        if (res.status === 401 && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:expired", { detail: { message: msg } }));
        }
        throw new Error(msg);
    }

    return data;
}


export const api = {
    login: (credentials) =>
        request("/auth/login", { method: "POST", body: credentials }),

    signup: (payload) =>
        request("/auth/signup", { method: "POST", body: payload }),

    logout: () =>
        request("/auth/logout", { method: "POST" }),

    me: () =>
        request("/auth/me"),

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
