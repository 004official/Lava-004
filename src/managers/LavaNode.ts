import WebSocket from "ws";
import { LavaClient } from "./LavaClient";
import { NodeOptions, NodeStats } from "../utils/Interfaces";

export class LavaNode {
	public readonly lavaOne: LavaClient;
	/**
	 * ตัวเลือกสำหรับโหนด
	 */
	public readonly options: NodeOptions;
	/**
	 * สถานะระบบของโหนด
	 */
	public stats: NodeStats;
	/**
	 * สถานะการเชื่อมต่อของโหนด
	 */
	private readonly conStatus: { doRetry: number; attempts: number };
	/**
	 * การเชื่อมต่อ websocket
	 */
	public con?: WebSocket | null;
	/**
	 * จัดการการเชื่อมต่อใหม่
	 */
	private reconnectModule?: NodeJS.Timeout;

	/**
	 * สร้างอินสแตนซ์คลาส LavaNode ใหม่
	 * @param {LavaClient} lavaOne - LavaClient.
	 * @param {NodeOptions} options - ตัวเลือก LavaNode
	 */
	constructor(lavaOne: LavaClient, options: NodeOptions) {
		this.lavaOne = lavaOne;
		this.options = options;

		this.stats = {
			playingPlayers: 0,
			memory: {
				reservable: 0,
				used: 0,
				free: 0,
				allocated: 0,
			},
			players: 0,
			cpu: {
				cores: 0,
				systemLoad: 0,
				lavalinkLoad: 0,
			},
			uptime: 0,
		};

		this.conStatus = {
			attempts: 0,
			doRetry: options.retries || 5,
		};

		this.connect();
	}

	/**
	 * สถานะการใช้งานระบบของโหนด
	 * @return {NodeStats}
	 * @readonly
	 */
	public get systemStats(): NodeStats {
		return this.stats;
	}

	/**
	 * สถานะการเชื่อมต่อของโหนด
	 * @return {Boolean}
	 * @readonly
	 */
	public get online(): boolean {
		if (!this.con) return false;
		return this.con.readyState === WebSocket.OPEN;
	}

	/**
	 * สร้างการเชื่อมต่อโหนด websocket
	 */
	public connect(): void {
		const headers = {
			Authorization: this.options.password,
			"Num-Shards": this.lavaOne.shards,
			"User-Id": this.lavaOne.client.user.id,
		};
		this.con! = new WebSocket(
			`ws://${this.options.host}:${this.options.port}/`,
			{ headers }
		);
		this.con!.on("open", this.onConnect.bind(this));
		this.con!.on("error", this.onError.bind(this));
		this.con!.on("close", this.onClose.bind(this));
		this.con!.on("message", this.handleResponse.bind(this));
	}

	/**
	 * จัดการการเชื่อมต่อที่ประสบความสำเร็จ
	 */
	private onConnect(): void {
		clearTimeout(this.reconnectModule!);
		this.lavaOne.emit("nodeSuccess", this);
	}

	/**
	 * จัดการเหตุการณ์การเชื่อมต่อแบบปิด
	 * @param {Number} code - รหัสข้อผิดพลาด
	 * @param {String} reason - เหตุผล
	 */
	private onClose(code: number, reason: string): void {
		this.lavaOne.emit(
			"nodeClose",
			this,
			new Error(`ปิดการเชื่อมต่อด้วยรหัส : ${code} และ เหตุผล: ${reason}`)
		);
		if (code !== 1000 || reason !== "destroy") this.reconnect();
	}

	/**
	 * จัดการข้อผิดพลาดในการเชื่อมต่อ
	 * @param {Error} error - ข้อความแสดงข้อผิดพลาด
	 */
	private onError(error: Error): void {
		if (!error) return;
		this.lavaOne.emit("nodeError", this, error);
		this.reconnect();
	}

	/**
	 * เชื่อมต่อกับโหนดอีกครั้งหากไม่ได้เชื่อมต่อ
	 */
	public reconnect(): void {
		this.reconnectModule = setTimeout(() => {
			if (this.conStatus.attempts >= this.conStatus.doRetry) {
				this.lavaOne.emit(
					"nodeError",
					this,
					new Error(
						`ไม่สามารถเชื่อมต่อโหนดหลังจากพยายาม ${this.conStatus.attempts}!`
					)
				);
				return this.kill();
			}
			this.con!.removeAllListeners();
			this.con = null;
			this.lavaOne.emit("nodeReconnect", this);
			this.connect();
			this.conStatus.attempts++;
		}, 3e4);
	}

	/**
	 * ทำลายโหนด
	 */
	public kill(): void {
		if (!this.online) return;
		this.con!.close(1000, "destroy");
		this.con!.removeAllListeners();
		this.con = null;
		this.lavaOne.nodeCollection.delete(this.options.host);
	}

	/**
	 * จัดการข้อมูลขาเข้าจากโหนด
	 */
	private handleResponse(data: any): void {
		const msg = JSON.parse(data.toString());
		const { op, type, code, guildId, state } = msg;
		if (!op) return;

		if (op !== "event") {
			// จัดการข้อความเหตุการณ์ที่ไม่ใช่การติดตาม
			switch (op) {
				case "stats":
					this.stats = Object.assign({}, msg);
					delete (this.stats as any).op;
					break;

				case "playerUpdate":
					const player = this.lavaOne.playerCollection.get(guildId);
					if (player) player.position = state.position || 0;
					break;
			}
		} else if (op === "event") {
			const player = this.lavaOne.playerCollection.get(guildId);
			if (!player) return;
			player.playState = false;
			const track = player.queue.first;

			// จัดการติดตามข้อความเหตุการณ์
			switch (type) {
				case "TrackStartEvent":
					player.playState = true;
					this.lavaOne.emit("trackPlay", track, player);
					break;

				case "TrackEndEvent":
					if (!track) return;
					if (track && player.queue.repeatTrack) {
						player.play();
					} else if (track && player.queue.repeatQueue) {
						const toAdd = player.queue.remove();
						if (toAdd) player.queue.add(toAdd);
						player.play();
					} else if (track && player.queue.size > 1) {
						player.queue.remove();
						player.play();
					} else if (track && player.queue.size === 1) {
						player.queue.remove();
						this.lavaOne.emit("queueOver", player);
					}
					break;

				case "TrackStuckEvent":
					if (!track) return;
					player.queue.remove();
					if (player.queue.skipOnError) player.play();
					this.lavaOne.emit("trackStuck", track, player, msg);
					break;

				case "TrackExceptionEvent":
					if (!track) return;
					player.queue.remove();
					if (player.queue.skipOnError) player.play();
					this.lavaOne.emit("trackError", track, player, msg);
					break;

				case "WebSocketClosedEvent":
					if ([4009, 4015].includes(code))
						this.lavaOne.wsSend({
							op: 4,
							d: {
								guild_id: guildId,
								channel_id: player.options.voiceChannel.id,
								self_mute: false,
								self_deaf: player.options.deafen || false,
							},
						});
					this.lavaOne.emit("socketClosed", this, msg);
					break;
			}
		} else {
			// หากข้อความมี OP. ที่ไม่รู้จัก
			this.lavaOne.emit(
				"nodeError",
				this,
				new Error(`ข้อผิดพลาด / เหตุการณ์ที่ไม่รู้จักกับ op : ${op} และข้อมูล ${msg}!`)
			);
		}
	}

	/**
	 * ส่งข้อมูลไปยังโหนด websocket
	 * @param {Object} data - แพ็กเก็ตข้อมูล
	 * @returns {Promise<Boolean>}
	 */
	public wsSend(data: Object): Promise<boolean> {
		return new Promise((res, rej) => {
			if (!this.online) res(false);

			const formattedData = JSON.stringify(data);
			if (!formattedData || !formattedData.startsWith("{"))
				rej(`ข้อมูลไม่อยู่ในรูปแบบที่เหมาะสม`);

			this.con!.send(formattedData, (err) => {
				err ? rej(err) : res(true);
			});
		});
	}
}
