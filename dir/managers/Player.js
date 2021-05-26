"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const axios_1 = __importDefault(require("axios"));
const Queue_1 = require("./Queue");
const Utils_1 = require("../utils/Utils");
class Player {
    /**
     * คลาสเครื่องเล่นที่เล่นเพลง
     * @param {LavaClient} lavaOne - LavaClient.
     * @param {PlayerOptions} options - ตัวเลือกของผู้เล่น
     * @param {QueueOptions} [queueOption] - ตัวเลือกคิว
     * @param {LavaNode} [node=optimisedNode] - โหนดที่จะใช้
     */
    constructor(lavaOne, options, queueOption, node) {
        /**
         * ผู้เล่นมีแทร็กที่โหลดหรือไม่
         */
        this.playState = false;
        /**
         * ตำแหน่งของแทร็ก
         */
        this.position = 0;
        /**
         * ไม่ว่าผู้เล่นจะหยุดชั่วคราว
         */
        this.playPaused = false;
        this.lavaOne = lavaOne;
        this.options = options;
        this.node = node || this.lavaOne.optimisedNode;
        this.volume = options.volume || 100;
        this.queue = new Queue_1.Queue(this, queueOption ? queueOption : {});
        this.bands = new Array();
        // ตั้งค่าแถบความถี่เริ่มต้น
        for (let i = 0; i < 15; i++) {
            this.bands.push({ band: i, gain: 0.0 });
        }
        // สร้างการเชื่อมต่อเสียงที่ไม่ลงรอยกัน
        this.lavaOne.wsSend({
            op: 4,
            d: {
                guild_id: options.guild.id,
                channel_id: options.voiceChannel.id,
                self_deaf: options.deafen || false,
                self_mute: false,
            },
        });
        this.lavaOne.playerCollection.set(options.guild.id, this);
        this.lavaOne.emit("createPlayer", this);
    }
    /**
     * ผู้เล่นมีแทร็กที่โหลดหรือไม่
     * @return {Boolean}
     */
    get playing() {
        return this.playState;
    }
    /**
     * ไม่ว่าผู้เล่นจะหยุดชั่วคราว
     * @return {Boolean}
     */
    get paused() {
        return this.playPaused;
    }
    /**
     * ตั้งค่า EQ Bands แบบกำหนดเองสำหรับเครื่องเล่น ( ไม่มีพารามิเตอร์รีเซ็ตแถบ )
     * @param {Array} [data] - ค่า EQ Bands ใหม่
     */
    EQBands(data) {
        if (!data) {
            this.bands.splice(0);
            for (let i = 0; i < 15; i++) {
                this.bands.push({ band: i, gain: 0.0 });
            }
        }
        else {
            for (let i = 0; i < data.length; i++) {
                if (data[i].band > 14 || data[i].band < 0)
                    throw new RangeError(`Player#setEQ() EQ ควรอยู่ระหว่าง 0 - 14.`);
                if (data[i].gain > 1 || data[i].gain < -0.25)
                    throw new RangeError(`Player#setEQ() gain ควรอยู่ระหว่าง -0.25 - 1.`);
                const old = this.bands.find((x) => x.band === data[i].band);
                this.bands.splice(this.bands.indexOf(old), 1);
                this.bands.push(data[i]);
            }
        }
        this.node
            .wsSend({
            op: "equalizer",
            guildId: this.options.guild.id,
            bands: this.bands,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
    }
    /**
     * เปลี่ยนช่องเสียงของผู้เล่น
     * @param {VoiceChannel} channel - ช่องเสียงใหม่
     */
    movePlayer(channel) {
        if (!channel)
            throw new Error(`Player#movePlayer() ไม่มีช่องเสียงให้!`);
        this.lavaOne.wsSend({
            op: 4,
            d: {
                guild_id: this.options.guild.id,
                channel_id: channel.id,
                self_deaf: this.options.deafen || false,
                self_mute: false,
            },
        });
    }
    /**
     * เล่นเพลงถัดไปในคิว
     */
    play() {
        if (this.queue.empty)
            throw new RangeError(`Player#play() ไม่มีแทร็กในคิว`);
        if (this.playing) {
            return this.stop();
        }
        const track = this.queue.first;
        this.node
            .wsSend({
            op: "play",
            track: track.trackString,
            guildId: this.options.guild.id,
            volume: this.volume,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
    }
    /**
     * ค้นหาแทร็กหรือเพลย์ลิสต์จาก YouTube
     * @param {String} query - ชื่อเพลงหรือเพลย์ลิสต์หรือลิงค์
     * @param {GuildMember} user - ผู้ใช้ที่ร้องขอการติดตาม
     * @param {{ source: "yt" | "sc", add: boolean }} [options] - พารามิเตอร์พิเศษสำหรับคิว
     * @return {Promise<Array<Track>|Playlist>} result - ข้อมูลการค้นหาอาจเป็นแทร็กเดี่ยวหรือเพลย์ลิสต์หรืออาร์เรย์ของแทร็ก
     */
    lavaSearch(query, user, options) {
        return new Promise(async (resolve, reject) => {
            const search = new RegExp(/^https?:\/\//g).test(query)
                ? encodeURI(query)
                : `${options.source || "yt"}search:${query}`;
            const { loadType, playlistInfo, tracks, exception } = await axios_1.default.get(`http://${this.node.options.host}:${this.node.options.port}/loadtracks?identifier=${search}`, {
                headers: { Authorization: this.node.options.password },
            }).then((response) => response.data);
            switch (loadType) {
                // Successful loading
                case "TRACK_LOADED":
                    const arr = [];
                    const trackData = Utils_1.Utils.newTrack(tracks[0], user);
                    arr.push(trackData);
                    if (options.add !== true)
                        return resolve(arr);
                    this.queue.add(trackData);
                    resolve(arr);
                    break;
                case "PLAYLIST_LOADED":
                    const data = {
                        name: playlistInfo.name,
                        trackCount: tracks.length,
                        tracks: tracks,
                    };
                    const playlist = Utils_1.Utils.newPlaylist(data, user);
                    resolve(playlist);
                    break;
                case "SEARCH_RESULT":
                    const res = tracks.map((t) => Utils_1.Utils.newTrack(t, user));
                    resolve(res);
                    break;
                // Error loading
                case "NO_MATCHES":
                    reject(new Error(`Player#lavaSearch() No result found for the search query.`));
                    break;
                case "LOAD_FAILED":
                    const { message, severity } = exception;
                    reject(new Error(`Player#lavaSearch() ${message} (Severity: ${severity}).`));
                    break;
            }
        });
    }
    /**
     * ค้นหาแทร็กหรือเพลย์ลิสต์จาก spotify
     * @param {String} query - ชื่อเพลงหรือเพลย์ลิสต์หรือลิงค์
     * @param {GuildMember} user - ผู้ใช้ที่ร้องขอการติดตาม
     * @param {{ source: "getTrack" | "getAlbumTracks" | "getPlaylistTracks" }} [options] - พารามิเตอร์พิเศษสำหรับคิว
     * @return {Promise<Array<Track>|Playlist>} result - ข้อมูลการค้นหาอาจเป็นแทร็กเดี่ยวหรือเพลย์ลิสต์หรืออาร์เรย์ของแทร็ก
     */
    spotifySearch(query, user, options) {
        return new Promise(async (resolve, reject) => {
            const search = new RegExp(/^https?:\/\//g).test(query)
                ? encodeURI(query)
                : `${options.source || "yt"}search:${query}`;
            const { loadType, playlistInfo, tracks, exception } = await axios_1.default.get(`http://${this.node.options.host}:${this.node.options.port}/loadtracks?identifier=${search}`, {
                headers: { Authorization: this.node.options.password },
            }).then((response) => response.data);
            switch (loadType) {
                // Successful loading
                case "TRACK_LOADED":
                    const arr = [];
                    const trackData = Utils_1.Utils.newTrack(tracks[0], user);
                    arr.push(trackData);
                    if (options.add !== true)
                        return resolve(arr);
                    this.queue.add(trackData);
                    resolve(arr);
                    break;
                case "PLAYLIST_LOADED":
                    const data = {
                        name: playlistInfo.name,
                        trackCount: tracks.length,
                        tracks: tracks,
                    };
                    const playlist = Utils_1.Utils.newPlaylist(data, user);
                    resolve(playlist);
                    break;
                case "SEARCH_RESULT":
                    const res = tracks.map((t) => Utils_1.Utils.newTrack(t, user));
                    resolve(res);
                    break;
                // Error loading
                case "NO_MATCHES":
                    reject(new Error(`Player#lavaSearch() No result found for the search query.`));
                    break;
                case "LOAD_FAILED":
                    const { message, severity } = exception;
                    reject(new Error(`Player#lavaSearch() ${message} (Severity: ${severity}).`));
                    break;
            }
        });
    }
    /**
     * หยุดเครื่องเล่น
     */
    stop() {
        this.node
            .wsSend({
            op: "stop",
            guildId: this.options.guild.id,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
    }
    /**
     * หยุดแทร็กชั่วคราวหากผู้เล่นกลับมาเล่นต่อ
     */
    pause() {
        if (this.paused)
            throw new Error(`Player#pause() เครื่องเล่นถูกหยุดชั่วคราวอยู่`);
        this.node
            .wsSend({
            op: "pause",
            guildId: this.options.guild.id,
            pause: true,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
        this.playPaused = true;
    }
    /**
     * เล่นแทร็กต่อหากผู้เล่นหยุดชั่วคราว
     */
    resume() {
        if (!this.paused)
            throw new Error(`Player#resume() ผู้เล่นกำลังเล่นอยู่`);
        this.node
            .wsSend({
            op: "pause",
            guildId: this.options.guild.id,
            pause: false,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
        this.playPaused = false;
    }
    /**
     * ค้นหาแทร็กเพื่อข้ามไปที่เวลาที่ตั้งไว้
     * @param {Number} position - ตำแหน่งที่ต้องการ
     */
    seek(position) {
        if (this.queue.empty)
            throw new RangeError(`Player#seek() ไม่มีแทร็กในคิว`);
        if (isNaN(position))
            throw new RangeError(`Player#seek() ตำแหน่งที่ระบุไม่ใช่ตัวเลข`);
        if (position < 0 || position > this.queue.first.length)
            throw new RangeError(`Player#seek() ตำแหน่งที่ระบุต้องอยู่ระหว่าง 0 - ${this.queue.first.length}.`);
        this.position = position;
        this.node
            .wsSend({
            op: "seek",
            guildId: this.options.guild.id,
            position: position,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
    }
    /**
     * ตั้งค่าระดับเสียงของผู้เล่น หรือ รีเซ็ตเป็น 100
     * @param {Number} [volume=100] - ไดรฟ์ข้อมูลใหม่
     */
    setVolume(volume = 100) {
        if (isNaN(volume))
            throw new RangeError(`Player#volume() ไดรฟ์ข้อมูลที่ระบุไม่ใช่ตัวเลข`);
        if (volume < 0 || volume > 1000)
            throw new RangeError(`Player#setVolume() ปริมาณที่ระบุต้องอยู่ระหว่าง 0 - 1,000`);
        this.volume = volume;
        this.node
            .wsSend({
            op: "volume",
            guildId: this.options.guild.id,
            volume: volume,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
    }
    /**
     * Destroy the player
     */
    destroy() {
        this.lavaOne.wsSend({
            op: 4,
            d: {
                guild_id: this.options.guild.id,
                channel_id: null,
                self_deaf: false,
                self_mute: false,
            },
        });
        this.node
            .wsSend({
            op: "destroy",
            guildId: this.options.guild.id,
        })
            .catch((err) => {
            if (err)
                throw new Error(err);
        });
        this.lavaOne.playerCollection.delete(this.options.guild.id);
        this.lavaOne.emit("destroyPlayer", this);
    }
}
exports.Player = Player;
