import axios from "axios";
import { LavaClient } from "./LavaClient";
import { LavaNode } from "./LavaNode";
import { Queue } from "./Queue";
import { Utils } from "../utils/Utils";
import {
	PlayerOptions,
	Playlist,
	QueueOptions,
	Track,
} from "../utils/Interfaces";
import { GuildMember, VoiceChannel } from "discord.js";

export class Player {
	/**
	 * อินสแตนซ์ LavaClient
	 */
	public readonly lavaOne: LavaClient;
	/**
	 * ตัวเลือกสำหรับไฟล์ผู้เล่น
	 */
	public readonly options: PlayerOptions;
	/**
	 * โหนดของเครื่องเล่นนี้
	 */
	public readonly node: LavaNode;
	/**
	 * คิวเครื่องเล่น
	 */
	public readonly queue: Queue;
	/**
	 * คอลเลกชันวงดนตรี
	 */
	public readonly bands: Array<{ band: number; gain: number }>;
	/**
	 * ผู้เล่นมีแทร็กที่โหลดหรือไม่
	 */
	public playState: boolean = false;
	/**
	 * ตำแหน่งของแทร็ก
	 */
	public position: number = 0;
	/**
	 * ระดับเสียงของผู้เล่น
	 */
	public volume: number;
	/**
	 * ไม่ว่าผู้เล่นจะหยุดชั่วคราว
	 */
	public playPaused: boolean = false;

	/**
	 * คลาสเครื่องเล่นที่เล่นเพลง
	 * @param {LavaClient} lavaOne - LavaClient.
	 * @param {PlayerOptions} options - ตัวเลือกของผู้เล่น
	 * @param {QueueOptions} [queueOption] - ตัวเลือกคิว
	 * @param {LavaNode} [node=optimisedNode] - โหนดที่จะใช้
	 */
	constructor(
		lavaOne: LavaClient,
		options: PlayerOptions,
		queueOption?: QueueOptions,
		node?: LavaNode
	) {
		this.lavaOne = lavaOne;
		this.options = options;
		this.node = node || this.lavaOne.optimisedNode;

		this.volume = options.volume || 100;

		this.queue = new Queue(this, queueOption ? queueOption : {});
		this.bands = new Array<{ band: number; gain: number }>();

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
	public get playing(): boolean {
		return this.playState;
	}

	/**
	 * ไม่ว่าผู้เล่นจะหยุดชั่วคราว
	 * @return {Boolean}
	 */
	public get paused(): boolean {
		return this.playPaused;
	}

	/**
	 * ตั้งค่า EQ Bands แบบกำหนดเองสำหรับเครื่องเล่น ( ไม่มีพารามิเตอร์รีเซ็ตแถบ )
	 * @param {Array} [data] - ค่า EQ Bands ใหม่
	 */
	public EQBands(data?: { band: number; gain: number }[]): void {
		if (!data) {
			this.bands.splice(0);
			for (let i = 0; i < 15; i++) {
				this.bands.push({ band: i, gain: 0.0 });
			}
		} else {
			for (let i = 0; i < data.length; i++) {
				if (data[i].band > 14 || data[i].band < 0)
					throw new RangeError(
						`Player#setEQ() EQ ควรอยู่ระหว่าง 0 - 14.`
					);
				if (data[i].gain > 1 || data[i].gain < -0.25)
					throw new RangeError(
						`Player#setEQ() gain ควรอยู่ระหว่าง -0.25 - 1.`
					);
				const old = this.bands.find((x) => x.band === data[i].band);
				this.bands.splice(this.bands.indexOf(old!), 1);
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
				if (err) throw new Error(err);
			});
	}

	/**
	 * เปลี่ยนช่องเสียงของผู้เล่น
	 * @param {VoiceChannel} channel - ช่องเสียงใหม่
	 */
	public movePlayer(channel: VoiceChannel): void {
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
	public play(): void {
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
				if (err) throw new Error(err);
			});
	}

	/**
	 * ค้นหาแทร็กหรือเพลย์ลิสต์จาก YouTube
	 * @param {String} query - ชื่อเพลงหรือเพลย์ลิสต์หรือลิงค์
	 * @param {GuildMember} user - ผู้ใช้ที่ร้องขอการติดตาม
	 * @param {{ source: "yt" | "sc", add: boolean }} [options] - พารามิเตอร์พิเศษสำหรับคิว
	 * @return {Promise<Array<Track>|Playlist>} result - ข้อมูลการค้นหาอาจเป็นแทร็กเดี่ยวหรือเพลย์ลิสต์หรืออาร์เรย์ของแทร็ก
	 */
	public lavaSearch(
		query: string,
		user: GuildMember,
		options: { source?: "yt" | "sc"; add?: boolean }
	): Promise<Track[] | Playlist> {
		return new Promise(async (resolve, reject) => {
			const search = new RegExp(/^https?:\/\//g).test(query)
				? encodeURI(query)
				: `${options.source || "yt"}search:${query}`;

			const { loadType, playlistInfo, tracks, exception } = await axios.get(
				`http://${this.node.options.host}:${this.node.options.port}/loadtracks?identifier=${search}`,
				{
					headers: { Authorization: this.node.options.password },
				}
			).then((response) => response.data);

			switch (loadType) {
				// Successful loading
				case "TRACK_LOADED":
					const arr: Track[] = [];
					const trackData = Utils.newTrack(tracks[0], user);
					arr.push(trackData);
					if (options.add !== true) return resolve(arr);
					this.queue.add(trackData);
					resolve(arr);
					break;

				case "PLAYLIST_LOADED":
					const data = {
						name: playlistInfo.name,
						trackCount: tracks.length,
						tracks: tracks,
					};
					const playlist = Utils.newPlaylist(data, user);
					resolve(playlist);
					break;

				case "SEARCH_RESULT":
					const res = tracks.map((t: any) => Utils.newTrack(t, user));
					resolve(res);
					break;

				// Error loading
				case "NO_MATCHES":
					reject(
						new Error(
							`Player#lavaSearch() No result found for the search query.`
						)
					);
					break;

				case "LOAD_FAILED":
					const { message, severity } = exception;
					reject(
						new Error(`Player#lavaSearch() ${message} (Severity: ${severity}).`)
					);
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
	public spotifySearch(
		query: string,
		user: GuildMember,
		options: { source?: "getTrack" | "getAlbumTracks" | "getPlaylistTracks"; add?: boolean }
	): Promise<Track[] | Playlist> {
		return new Promise(async (resolve, reject) => {
			const search = new RegExp(/^https?:\/\//g).test(query)
				? encodeURI(query)
				: `${options.source || "yt"}search:${query}`;

			const { loadType, playlistInfo, tracks, exception } = await axios.get(
				`http://${this.node.options.host}:${this.node.options.port}/loadtracks?identifier=${search}`,
				{
					headers: { Authorization: this.node.options.password },
				}
			).then((response) => response.data);

			switch (loadType) {
				// Successful loading
				case "TRACK_LOADED":
					const arr: Track[] = [];
					const trackData = Utils.newTrack(tracks[0], user);
					arr.push(trackData);
					if (options.add !== true) return resolve(arr);
					this.queue.add(trackData);
					resolve(arr);
					break;

				case "PLAYLIST_LOADED":
					const data = {
						name: playlistInfo.name,
						trackCount: tracks.length,
						tracks: tracks,
					};
					const playlist = Utils.newPlaylist(data, user);
					resolve(playlist);
					break;

				case "SEARCH_RESULT":
					const res = tracks.map((t: any) => Utils.newTrack(t, user));
					resolve(res);
					break;

				// Error loading
				case "NO_MATCHES":
					reject(
						new Error(
							`Player#lavaSearch() No result found for the search query.`
						)
					);
					break;

				case "LOAD_FAILED":
					const { message, severity } = exception;
					reject(
						new Error(`Player#lavaSearch() ${message} (Severity: ${severity}).`)
					);
					break;
			}
		});
	}

	/**
	 * หยุดเครื่องเล่น
	 */
	public stop(): void {
		this.node
			.wsSend({
				op: "stop",
				guildId: this.options.guild.id,
			})
			.catch((err) => {
				if (err) throw new Error(err);
			});
	}

	/**
	 * หยุดแทร็กชั่วคราวหากผู้เล่นกลับมาเล่นต่อ
	 */
	public pause(): void {
		if (this.paused)
			throw new Error(`Player#pause() เครื่องเล่นถูกหยุดชั่วคราวอยู่`);

		this.node
			.wsSend({
				op: "pause",
				guildId: this.options.guild.id,
				pause: true,
			})
			.catch((err) => {
				if (err) throw new Error(err);
			});

		this.playPaused = true;
	}

	/**
	 * เล่นแทร็กต่อหากผู้เล่นหยุดชั่วคราว
	 */
	public resume(): void {
		if (!this.paused)
			throw new Error(`Player#resume() ผู้เล่นกำลังเล่นอยู่`);

		this.node
			.wsSend({
				op: "pause",
				guildId: this.options.guild.id,
				pause: false,
			})
			.catch((err) => {
				if (err) throw new Error(err);
			});

		this.playPaused = false;
	}

	/**
	 * ค้นหาแทร็กเพื่อข้ามไปที่เวลาที่ตั้งไว้
	 * @param {Number} position - ตำแหน่งที่ต้องการ
	 */
	public seek(position: number): void {
		if (this.queue.empty)
			throw new RangeError(`Player#seek() ไม่มีแทร็กในคิว`);
		if (isNaN(position))
			throw new RangeError(
				`Player#seek() ตำแหน่งที่ระบุไม่ใช่ตัวเลข`
			);
		if (position < 0 || position > this.queue.first.length)
			throw new RangeError(
				`Player#seek() ตำแหน่งที่ระบุต้องอยู่ระหว่าง 0 - ${this.queue.first.length}.`
			);

		this.position = position;
		this.node
			.wsSend({
				op: "seek",
				guildId: this.options.guild.id,
				position: position,
			})
			.catch((err) => {
				if (err) throw new Error(err);
			});
	}

	/**
	 * ตั้งค่าระดับเสียงของผู้เล่น หรือ รีเซ็ตเป็น 100
	 * @param {Number} [volume=100] - ไดรฟ์ข้อมูลใหม่
	 */
	public setVolume(volume: number = 100): void {
		if (isNaN(volume))
			throw new RangeError(
				`Player#volume() ไดรฟ์ข้อมูลที่ระบุไม่ใช่ตัวเลข`
			);
		if (volume < 0 || volume > 1000)
			throw new RangeError(
				`Player#setVolume() ปริมาณที่ระบุต้องอยู่ระหว่าง 0 - 1,000`
			);

		this.volume = volume;
		this.node
			.wsSend({
				op: "volume",
				guildId: this.options.guild.id,
				volume: volume,
			})
			.catch((err) => {
				if (err) throw new Error(err);
			});
	}

	/**
	 * Destroy the player
	 */
	public destroy(): void {
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
				if (err) throw new Error(err);
			});

		this.lavaOne.playerCollection.delete(this.options.guild.id);
		this.lavaOne.emit("destroyPlayer", this);
	}
}
