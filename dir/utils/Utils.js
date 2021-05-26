"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
class Utils {
    /**
     * สร้างแทร็กใหม่
     * @param {*} data - ติดตามข้อมูลจาก LavaLink.
     * @param {GuildMember} user - ผู้ใช้ร้องขอการติดตาม
     * @return {Track}
     */
    static newTrack(data, user) {
        const trackData = {};
        if (!data.info || !data.track)
            throw new Error(`newTrack() ข้อมูลต้องเข้ารหัสเป็นแทร็ก LavaLink`);
        Object.assign(trackData, data.info);
        trackData.trackString = data.track;
        trackData.thumbnail = trackData.uri.includes("youtube")
            ? {
                default: `https://img.youtube.com/vi/${data.info.identifier}/default.jpg`,
                medium: `https://img.youtube.com/vi/${data.info.identifier}/mqdefault.jpg`,
                high: `https://img.youtube.com/vi/${data.info.identifier}/hqdefault.jpg`,
                standard: `https://img.youtube.com/vi/${data.info.identifier}/sddefault.jpg`,
                max: `https://img.youtube.com/vi/${data.info.identifier}/maxresdefault.jpg`,
            }
            : {};
        trackData.user = user;
        return trackData;
    }
    /**
     * Make a new playlist
     * @param {*} data - ติดตามข้อมูลจาก LavaLink.
     * @param {GuildMember} user - ผู้ใช้ขอเพลย์ลิสต์
     * @return {Playlist}
     */
    static newPlaylist(data, user) {
        const { name, trackCount, tracks: trackArray } = data;
        if (!(name || trackCount || trackArray || Array.isArray(trackArray)))
            throw new Error(`newPlaylist() ข้อมูลต้องเข้ารหัสเป็นเพลย์ลิสต์ LavaLink`);
        const playlistData = {
            name: name,
            trackCount: trackCount,
            duration: trackArray
                .map((t) => t.info.length)
                .reduce((acc, val) => acc + val, 0),
            tracks: [],
        };
        for (let i = 0; i < trackCount; i++)
            playlistData.tracks.push(this.newTrack(trackArray[i], user));
        return playlistData;
    }
    /**
     * เปลี่ยนจาก ms เป็นเวลา HH:MM:SS:
     * @param {Number} ms - ระยะเวลาเป็นมิลลิวินาที
     * @return {String} time - การประทับเวลาที่จัดรูปแบบ
     */
    static formatTime(ms) {
        const time = {
            d: 0,
            h: 0,
            m: 0,
            s: 0,
        };
        time.s = Math.floor(ms / 1000);
        time.m = Math.floor(time.s / 60);
        time.s = time.s % 60;
        time.h = Math.floor(time.m / 60);
        time.m = time.m % 60;
        time.d = Math.floor(time.h / 24);
        time.h = time.h % 24;
        const res = [];
        for (const [k, v] of Object.entries(time)) {
            let first = false;
            if (v < 1 && !first)
                continue;
            res.push(v < 10 ? `0${v}` : `${v}`);
            first = true;
        }
        return res.join(":");
    }
}
exports.Utils = Utils;
