import axios from "axios";
import { URLSearchParams } from "url";

const BASE_URL = "https://api.spotify.com/v1";

export interface Node {
    host: string;
    port: string;
    password: string;
}

export interface Album {
    items: SpotifyTrack[];
}

export interface Artist {
    name: string;
}

export interface LavalinkTrack {
    track: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri: string;
    }
}

export interface LavalinkSearchResult {
    tracks: LavalinkTrack[];
}

export interface SpotifyPlaylist {
    tracks: {
        total: number;
    }
}

export interface PlaylistItems {
    items: [{ track: SpotifyTrack }];
}

export interface SpotifyTrack {
    artists: Artist[];
    name: string;
    duration_ms: number;
}


/**
 * @typedef FetchOptions
 * @name FetchOptions
 * @type {object}
 * @property {boolean} prioritizeSameDuration - ไม่ว่าจะจัดลำดับความสำคัญของลาวางแทร็กที่มีระยะเวลาเดียวกันกับแทร็ก Spotify
 */
export interface FetchOptions {
    prioritizeSameDuration: boolean;
    /**
     * @param lavalinkTrack แทร็ก Lavalink สำหรับแต่ละผลลัพธ์เปลี่ยนการทำซ้ำแต่ละครั้ง
     * @param spotifyTrack The Spotify Track เทียบเท่ากับแทร็ก Lavalinkเปลี่ยนการทำซ้ำแต่ละครั้ง
     * @returns {boolean} ผลการบูลีนของฟังก์ชั่นเปรียบเทียบไม่ว่าจะติดตามลาวาลลิงค์ยังคงอยู่หรือถูกทิ้ง
     */
    customFilter(lavalinkTrack: LavalinkTrack, spotifyTrack: SpotifyTrack): boolean;
    /**
     * 
     * @param comparableTrack แทร็ก Lavalink ถูกเปรียบเทียบกับแทร็ก Lavalink อื่น ๆเปลี่ยนการทำซ้ำแต่ละครั้ง
     * @param compareToTrack ลาวลิงค์อื่น ๆ แทร็กที่แทร็กลาวางเทียบเท่าถูกเปรียบเทียบกับโปรดทราบว่าฟังก์ชั่นทำงานกับแทร็ก Lavalink อื่น ๆ แต่ละแทร็ก
     * @param spotifyTrack  Spotify Track เทียบเท่ากับแทร็ก Lavalink ที่เทียบเท่าที่คุณสามารถใช้เพื่อเปรียบเทียบแทร็ก Lavalink ซึ่งกันและกันเปลี่ยนการทำซ้ำแต่ละครั้ง
     * @returns {number}ตัวเลขที่กำหนดตำแหน่งของการเปรียบเทียบในผลลัพธ์แทร็กย้ายไปที่แรกหากมีการส่งคืนจำนวนลบ 0 ถ้ามันจะอยู่ในตำแหน่งเดียวกันกับที่เกี่ยวกับแทร็กอื่น ๆ และจำนวนบวกถ้ามันจะย้ายไปยังจุดสิ้นสุด
     */
    customSort(comparableTrack: LavalinkTrack, compareToTrack: LavalinkTrack, spotifyTrack: SpotifyTrack): number;
}

export class Spotify {
    public nodes!: Node;
    private authorization: string;
    private token: string;
    private options: { headers: { "Content-Type": string; Authorization: string; }; };

    /**
     * คลาสที่จะแปลง Spotify URL เป็นวัตถุติดตาม Lavalink
     * @param {string} clientID รหัสลูกค้าของ Spotify ของคุณ
     * @param {string} clientSecret ความลับของลูกค้าของ Spotify ของคุณ
     */
    constructor(clientID: string, clientSecret: string) {
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
    public async getAlbumTracks(id: string, convert = false, fetchOptions: FetchOptions): Promise<LavalinkTrack[] | SpotifyTrack[]> {
        if (!id) throw new ReferenceError("ไม่ได้ระบุรหัสอัลบั้ม");
        if (typeof id !== "string") throw new TypeError(`รหัสอัลบั้มต้องเป็นสตริงประเภทที่ได้รับ ${typeof id}`);

        const { items }: Album = await axios(`${BASE_URL}/albums/${id}/tracks`, this.options).then((result => result.data));

        if (convert) return Promise.all(items.map(async (item) => await this.fetchTrack(item, fetchOptions)) as unknown as LavalinkTrack[]);
        return items;
    }

    /**
     * ดึงแทร็กจากเพลย์ลิสต์และส่งคืนวัตถุ SpotifyTrack หรือ LavalinkTrack
     * @param {string} id The Playlist ID.
     * @param {boolean} convert ไม่ว่าจะส่งคืนผลลัพธ์เป็นวัตถุ LavalinkTrack แทนวัตถุ SpotifyTrack หรือไม่
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack[]|SpotifyTrack[]>} อาร์เรย์สัญญาของแทร็กในเพลย์ลิสต์ในรูปแบบของออบเจ็กต์ Lavalink Track (หากถูกแปลง) หรืออ็อบเจกต์ Spotify Track
     */
    public async getPlaylistTracks(id: string, convert = false, fetchOptions: FetchOptions): Promise<LavalinkTrack[] | SpotifyTrack[]> {
        if (!id) throw new ReferenceError("The playlist ID was not provided");
        if (typeof id !== "string") throw new TypeError(`The playlist ID must be a string, received type ${typeof id}`);

        const playlistInfo: SpotifyPlaylist = await axios(`${BASE_URL}/playlists/${id}`, this.options).then(response => response.data);
        const sets = Math.ceil(playlistInfo.tracks.total / 100);

        let items: SpotifyTrack[] = [];
        for (let set = 0; set < sets; set++) {
            const params = new URLSearchParams();
            params.set("limit", "100");
            params.set("offset", String(set * 100));
            const tracks = await axios(`${BASE_URL}/playlists/${id}/tracks?${params}`, this.options).then(response => response.data) as PlaylistItems;
            items = items.concat(tracks.items.map(item => item.track));
            if (set === 0) items.unshift();
        }

        if (convert) return Promise.all(items.map(async (item) => await this.fetchTrack(item, fetchOptions)) as unknown as LavalinkTrack[]);
        return items;
    }

    /**
     * ดึงแทร็กจากอัลบั้มและส่งคืนวัตถุ SpotifyTrack หรือ LavalinkTrack
     * @param {string} id The album ID.
     * @param {boolean} convert ไม่ว่าจะส่งคืนผลลัพธ์เป็นวัตถุ LavalinkTrack แทนวัตถุ SpotifyTrack หรือไม่
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack|SpotifyTrack>} ออบเจ็กต์ Lavalink Track ที่ได้รับสัญญา (ถ้าถูกแปลง) หรือวัตถุ Spotify Track
     */
    public async getTrack(id: string, convert = false, fetchOptions: FetchOptions): Promise<LavalinkTrack | SpotifyTrack> {
        if (!id) throw new ReferenceError("ไม่ได้ระบุรหัสแทร็ก");
        if (typeof id !== "string") throw new TypeError(`รหัสแทร็กต้องเป็นสตริงประเภทที่ได้รับ ${typeof id}`);

        const track: SpotifyTrack = (await axios(`${BASE_URL}/tracks/${id}`, this.options).then(response => response.data));

        if (convert) return this.fetchTrack(track, fetchOptions) as unknown as LavalinkTrack;
        return track;
    }

    /**
     * ส่งคืนวัตถุ LavalinkTrack จากวัตถุ SpotifyTrack
     * @param {SpotifyTrack} track วัตถุ SpotifyTrack ที่จะค้นหาและเปรียบเทียบกับ Lavalink API
     * @param {FetchOptions} fetchOptions วัตถุที่มีตัวเลือกในการดึงข้อมูลแทร็ก Lavalink ด้วยแทร็ก Spotify
     * @returns {Promise<LavalinkTrack|null>} ออบเจ็กต์ Lavalink Track ที่สัญญาไว้หรือเป็นโมฆะหากไม่พบรายการที่ตรงกัน
     */
    public async fetchTrack(track: SpotifyTrack, fetchOptions = { prioritizeSameDuration: false, customFilter: () => true, customSort: () => 0 } as FetchOptions): Promise<LavalinkTrack | null> {
        if (!track) throw new ReferenceError("ไม่ได้ระบุวัตถุติดตาม Spotify");
        if (!track.artists) throw new ReferenceError("ไม่ได้ระบุอาร์เรย์ศิลปินแทร็ก");
        if (!track.name) throw new ReferenceError("ไม่ได้ระบุชื่อแทร็ก");
        if (!Array.isArray(track.artists)) throw new TypeError(`แทร็กศิลปินต้องเป็นอาร์เรย์ประเภทที่ได้รับ ${typeof track.artists}`);
        if (typeof track.name !== "string") throw new TypeError(`ชื่อแทร็กต้องเป็นสตริงประเภทที่ได้รับ ${typeof track.name}`);

        const title = `${track.name} ${track.artists[0].name} description:("Auto-generated by YouTube.")`;

        const params = new URLSearchParams();
        params.append("identifier", `ytsearch: ${title}`);

        const { host, port, password } = this.nodes;
        const { tracks } = await axios(`http://${host}:${port}/loadtracks?${params}`, {
            headers: {
                Authorization: password
            }
        }).then(response => response.data) as LavalinkSearchResult;

        if (!tracks.length) return null;

        if (fetchOptions.prioritizeSameDuration) {
            const sameDuration = tracks.filter(searchResult => (searchResult.info.length >= (track.duration_ms - 1500)) && (searchResult.info.length <= (track.duration_ms + 1500)))[0];
            if (sameDuration) return sameDuration;
        }

        if (typeof fetchOptions.customFilter === "undefined") fetchOptions.customFilter = () => true;
        if (typeof fetchOptions.customSort === "undefined") fetchOptions.customSort = () => 0;

        return tracks
            .filter(searchResult => fetchOptions.customFilter(searchResult, track))
            .sort((comparableTrack, compareToTrack) => fetchOptions.customSort(comparableTrack, compareToTrack, track))[0];
    }


    private async renew(): Promise<void> {
        setTimeout(this.renew.bind(this), await this.renewToken());
    }

    private async renewToken(): Promise<number> {
        const { access_token, expires_in } = await axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token?grant_type=client_credentials',
            headers: {
                Authorization: `Basic ${this.authorization}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }).then(response => response.data);

        if (!access_token) throw new Error("ไคลเอนต์ Spotify ไม่ถูกต้อง");

        this.token = `Bearer ${access_token}`;
        this.options.headers.Authorization = this.token;

        // Convert expires_in into ms
        return expires_in * 1000;
    }
}