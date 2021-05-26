"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spotify = void 0;
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
const BASE_URL = "https://api.spotify.com/v1";
class Spotify {
    /**
     * คลาสที่จะแปลง Spotify URL เป็นวัตถุติดตาม Lavalink
     * @param {string} clientID รหัสลูกค้าของ Spotify ของคุณ
     * @param {string} clientSecret ความลับของลูกค้าของ Spotify ของคุณ
     */
    constructor(clientID, clientSecret) {
        this.authorization = Buffer.from(`${clientID}:${clientSecret}`).toString("base64");
        this.token = "";
        this.options = {
            headers: {
                "Content-Type": "application/json",
                Authorization: this.token
            }
        };
        this.renew();
    }
    /**
         * ดึงแทร็กออกจากอัลบั้มและส่งคืน SpotifyTrack หรือวัตถุ LavalinkTrack
         * @param {string} id The album ID.
         * @param {boolean} convert ไม่ว่าจะส่งคืนผลลัพธ์เป็นวัตถุ LavalinkTrack แทนที่จะเป็นวัตถุ SpotifyTrack
         * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกสำหรับการดึงแทร็ก Lavalink ด้วยแทร็ก Spotify
         * @returns {Promise<LavalinkTrack[]|SpotifyTrack[]>} อาร์เรย์ที่ได้รับการยกย่องของแทร็กในอัลบั้มในรูปแบบของ Lavalink Track Object (ถ้าแปลง) หรือวัตถุแทร็ก Spotify
         */
    async getAlbumTracks(id, convert = false, fetchOptions) {
        if (!id)
            throw new ReferenceError("ไม่ได้ระบุรหัสอัลบั้ม");
        if (typeof id !== "string")
            throw new TypeError(`รหัสอัลบั้มต้องเป็นสตริงประเภทที่ได้รับ ${typeof id}`);
        const { items } = await axios_1.default(`${BASE_URL}/albums/${id}/tracks`, this.options).then((result => result.data));
        if (convert)
            return Promise.all(items.map(async (item) => await this.fetchTrack(item, fetchOptions)));
        return items;
    }
    /**
     * ดึงแทร็กจากเพลย์ลิสต์และส่งคืนวัตถุ SpotifyTrack หรือ LavalinkTrack
     * @param {string} id The Playlist ID.
     * @param {boolean} convert ไม่ว่าจะส่งคืนผลลัพธ์เป็นวัตถุ LavalinkTrack แทนวัตถุ SpotifyTrack หรือไม่
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack[]|SpotifyTrack[]>} อาร์เรย์สัญญาของแทร็กในเพลย์ลิสต์ในรูปแบบของออบเจ็กต์ Lavalink Track (หากถูกแปลง) หรืออ็อบเจกต์ Spotify Track
     */
    async getPlaylistTracks(id, convert = false, fetchOptions) {
        if (!id)
            throw new ReferenceError("The playlist ID was not provided");
        if (typeof id !== "string")
            throw new TypeError(`The playlist ID must be a string, received type ${typeof id}`);
        const playlistInfo = await axios_1.default(`${BASE_URL}/playlists/${id}`, this.options).then(response => response.data);
        const sets = Math.ceil(playlistInfo.tracks.total / 100);
        let items = [];
        for (let set = 0; set < sets; set++) {
            const params = new url_1.URLSearchParams();
            params.set("limit", "100");
            params.set("offset", String(set * 100));
            const tracks = await axios_1.default(`${BASE_URL}/playlists/${id}/tracks?${params}`, this.options).then(response => response.data);
            items = items.concat(tracks.items.map(item => item.track));
            if (set === 0)
                items.unshift();
        }
        if (convert)
            return Promise.all(items.map(async (item) => await this.fetchTrack(item, fetchOptions)));
        return items;
    }
    /**
     * ดึงแทร็กจากอัลบั้มและส่งคืนวัตถุ SpotifyTrack หรือ LavalinkTrack
     * @param {string} id The album ID.
     * @param {boolean} convert ไม่ว่าจะส่งคืนผลลัพธ์เป็นวัตถุ LavalinkTrack แทนวัตถุ SpotifyTrack หรือไม่
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack|SpotifyTrack>} ออบเจ็กต์ Lavalink Track ที่ได้รับสัญญา (ถ้าถูกแปลง) หรือวัตถุ Spotify Track
     */
    async getTrack(id, convert = false, fetchOptions) {
        if (!id)
            throw new ReferenceError("ไม่ได้ระบุรหัสแทร็ก");
        if (typeof id !== "string")
            throw new TypeError(`รหัสแทร็กต้องเป็นสตริงประเภทที่ได้รับ ${typeof id}`);
        const track = (await axios_1.default(`${BASE_URL}/tracks/${id}`, this.options).then(response => response.data));
        if (convert)
            return this.fetchTrack(track, fetchOptions);
        return track;
    }
    /**
     * ส่งคืนวัตถุ LavalinkTrack จากวัตถุ SpotifyTrack
     * @param {SpotifyTrack} track วัตถุ SpotifyTrack ที่จะค้นหาและเปรียบเทียบกับ Lavalink API
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack|null>} ออบเจ็กต์ Lavalink Track ที่สัญญาไว้หรือเป็นโมฆะหากไม่พบรายการที่ตรงกัน
     */
    async fetchTrack(track, fetchOptions = { prioritizeSameDuration: false, customFilter: () => true, customSort: () => 0 }) {
        if (!track)
            throw new ReferenceError("ไม่ได้ระบุวัตถุติดตาม Spotify");
        if (!track.artists)
            throw new ReferenceError("ไม่ได้ระบุอาร์เรย์ศิลปินแทร็ก");
        if (!track.name)
            throw new ReferenceError("ไม่ได้ระบุชื่อแทร็ก");
        if (!Array.isArray(track.artists))
            throw new TypeError(`แทร็กศิลปินต้องเป็นอาร์เรย์ประเภทที่ได้รับ ${typeof track.artists}`);
        if (typeof track.name !== "string")
            throw new TypeError(`ชื่อแทร็กต้องเป็นสตริงประเภทที่ได้รับ ${typeof track.name}`);
        const title = `${track.name} ${track.artists[0].name} description:("Auto-generated by YouTube.")`;
        const params = new url_1.URLSearchParams();
        params.append("identifier", `ytsearch: ${title}`);
        const { host, port, password } = this.nodes;
        const { tracks } = await axios_1.default(`http://${host}:${port}/loadtracks?${params}`, {
            headers: {
                Authorization: password
            }
        }).then(response => response.data);
        if (!tracks.length)
            return null;
        if (fetchOptions.prioritizeSameDuration) {
            const sameDuration = tracks.filter(searchResult => (searchResult.info.length >= (track.duration_ms - 1500)) && (searchResult.info.length <= (track.duration_ms + 1500)))[0];
            if (sameDuration)
                return sameDuration;
        }
        if (typeof fetchOptions.customFilter === "undefined")
            fetchOptions.customFilter = () => true;
        if (typeof fetchOptions.customSort === "undefined")
            fetchOptions.customSort = () => 0;
        return tracks
            .filter(searchResult => fetchOptions.customFilter(searchResult, track))
            .sort((comparableTrack, compareToTrack) => fetchOptions.customSort(comparableTrack, compareToTrack, track))[0];
    }
    async renew() {
        setTimeout(this.renew.bind(this), await this.renewToken());
    }
    async renewToken() {
        const { access_token, expires_in } = await axios_1.default({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token?grant_type=client_credentials',
            headers: {
                Authorization: `Basic ${this.authorization}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }).then(response => response.data);
        if (!access_token)
            throw new Error("ไคลเอนต์ Spotify ไม่ถูกต้อง");
        this.token = `Bearer ${access_token}`;
        this.options.headers.Authorization = this.token;
        // Convert expires_in into ms
        return expires_in * 1000;
    }
}
exports.Spotify = Spotify;
