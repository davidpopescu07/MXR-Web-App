
const LENGTH_RE = /^(\d+:\d{2}|--:--)$/;

function validateCreateTrack(body) {
    const errors = [];

    if (!body || typeof body !== "object") return { valid: false, errors: ["Body must be a JSON object"] };

    const { title, artist, album, bpm, length, rating } = body;

    if (!title || typeof title !== "string" || title.trim() === "")
        errors.push("title is required and must be a non-empty string");

    if (!artist || typeof artist !== "string" || artist.trim() === "")
        errors.push("artist is required and must be a non-empty string");

    if (!album || typeof album !== "string" || album.trim() === "")
        errors.push("album is required and must be a non-empty string");

    if (bpm === undefined || bpm === null) {
        errors.push("bpm is required");
    } else if (!Number.isInteger(Number(bpm)) || Number(bpm) < 0 || Number(bpm) > 300) {
        errors.push("bpm must be an integer between 0 and 300");
    }

    if (!length || typeof length !== "string" || !LENGTH_RE.test(length))
        errors.push('length must be a string in "M:SS" or "--:--" format');

    if (rating === undefined || rating === null) {
        errors.push("rating is required");
    } else if (!Number.isInteger(Number(rating)) || Number(rating) < 0 || Number(rating) > 5) {
        errors.push("rating must be an integer between 0 and 5");
    }

    return errors.length ? { valid: false, errors } : { valid: true };
}


function validateUpdateTrack(body) {
    const errors = [];

    if (!body || typeof body !== "object") return { valid: false, errors: ["Body must be a JSON object"] };

    const { title, artist, album, bpm, length, rating } = body;

    if (title !== undefined && (typeof title !== "string" || title.trim() === ""))
        errors.push("title must be a non-empty string");

    if (artist !== undefined && (typeof artist !== "string" || artist.trim() === ""))
        errors.push("artist must be a non-empty string");

    if (album !== undefined && (typeof album !== "string" || album.trim() === ""))
        errors.push("album must be a non-empty string");

    if (bpm !== undefined && (!Number.isInteger(Number(bpm)) || Number(bpm) < 0 || Number(bpm) > 300))
        errors.push("bpm must be an integer between 0 and 300");

    if (length !== undefined && (typeof length !== "string" || !LENGTH_RE.test(length)))
        errors.push('length must be a string in "M:SS" or "--:--" format');

    if (rating !== undefined && (!Number.isInteger(Number(rating)) || Number(rating) < 0 || Number(rating) > 5))
        errors.push("rating must be an integer between 0 and 5");

    return errors.length ? { valid: false, errors } : { valid: true };
}

function validatePlaylistName(name) {
    const errors = [];
    if (!name || typeof name !== "string" || name.trim() === "")
        errors.push("name is required and must be a non-empty string");
    else if (name.length > 100)
        errors.push("name must be 100 characters or fewer");
    return errors.length ? { valid: false, errors } : { valid: true };
}


function parsePagination(query) {
    const errors = [];
    let page = parseInt(query.page ?? 1, 10);
    let limit = parseInt(query.limit ?? 5, 10);

    if (isNaN(page) || page < 1) errors.push("page must be a positive integer");
    if (isNaN(limit) || limit < 1 || limit > 100) errors.push("limit must be an integer between 1 and 100");

    return errors.length ? { valid: false, errors } : { valid: true, page, limit };
}

module.exports = { validateCreateTrack, validateUpdateTrack, validatePlaylistName, parsePagination };