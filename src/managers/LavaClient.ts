import { EventEmitter } from "events";
import { LavaNode } from "./LavaNode";
import { Player } from "./Player";
import { Cache } from "../utils/Cache";
import { NodeOptions, PlayerOptions, QueueOptions } from "../utils/Interfaces";
import { VoiceChannel } from "discord.js";
const states = new Map<string, any>();

export class LavaClient extends EventEmitter {
	[x: string]: any;
	/**
	 * Discord Client
	 */
	public readonly client: any;
	/**
	 * ตัวเลือกโหนดสำหรับ Client
	 */
	public readonly nodeOptions: NodeOptions[];
	/**
	 * จำนวน Shards ของ Client
	 */
	public readonly shards: number = 1;
	/**
	 * การรวบรวมโหนดของ client
	 */
	public readonly nodeCollection: Cache<string, LavaNode>;
	/**
	 * Collection of players of the client
	 */
	public readonly playerCollection: Cache<string, Player>;

	/**
	 * ส่งค่าออกมาเมื่อมีการเชื่อมต่อโหนด
	 * @event LavaClient#nodeSuccess
	 * @param {LavaNode} node - โหนดที่เชื่อมต่อ
	 */
	/**
	 * ส่งค่าออกมาเมื่อโหนดเชื่อมต่อใหม่
	 * @event LavaClient#nodeReconnect
	 * @param {LavaNode} node - โหนดที่กำลังเชื่อมต่อใหม่
	 */
	/**
	 * แสดงข้อผิดพลาดของโหนด
	 * @event LavaClient#nodeError
	 * @param {LavaNode} node - โหนดที่พบข้อผิดพลาด
	 * @param {Error} error - ข้อความแสดงข้อผิดพลาด
	 */
	/**
	 * ส่งค่าออกมาเมื่อโหนดปิด
	 * @event LavaClient#nodeClose
	 * @param {LavaNode} node - โหนดที่ถูกปิด
	 * @param {Error} error - ข้อความแสดงข้อผิดพลาด
	 */
	/**
	 * ส่งค่าออกมาเมื่อผู้เล่นถูกสร้างขึ้น
	 * @event LavaClient#createPlayer
	 * @param {Player} player - ผู้เล่นใหม่
	 */
	/**
	 * ส่งค่าออกมาเมื่อผู้เล่นถูกทำลาย
	 * @event LavaClient#destroyPlayer
	 * @param {Player} player - ผู้เล่นที่ถูกทำลาย
	 */
	/**
	 * ส่งค่าออกมาเมื่อคิวสิ้นสุดลง
	 * @event LavaClient#queueOver
	 * @param {Player} player - ผู้เล่นที่คิวสิ้นสุดลง
	 */
	/**
	 * ส่งค่าออกมาเมื่อแทร็กจบลง
	 * @event LavaClient#trackOver
	 * @param {Track} track - แทร็กที่จบลง
	 * @param {Player} player - ผู้เล่นที่กำลังเล่นแทร็ก
	 */
	/**
	 * ส่งค่าออกมาเมื่อแทร็กเริ่มต้น
	 * @event LavaClient#trackPlay
	 * @param {Track} track - แทร็กที่เริ่มต้น
	 * @param {Player} player - ผู้เล่นที่กำลังเล่นแทร็ก
	 */
	/**
	 * ส่งค่าออกมาเมื่อแทร็กหยุดอยู่
	 * @event LavaClient#trackStuck
	 * @param {Track} track - แทร็กที่หยุดอยู่
	 * @param {Player} player - ผู้เล่นที่กำลังเล่นแทร็ก
	 * @param {Error} error - ข้อความแสดงข้อผิดพลาด
	 */
	/**
	 * แสดงเมื่อแทร็กพบข้อผิดพลาด
	 * @event LavaClient#trackError
	 * @param {Track} track - ติดตามที่พบข้อผิดพลาด
	 * @param {Player} player - ผู้เล่นที่กำลังเล่นแทร็ก
	 * @param {Error} error - ข้อความแสดงข้อผิดพลาด
	 */

	/**
	 * สร้างอินสแตนซ์คลาส LavaOneClient ใหม่
	 * @param {*} client - Discord Client.
	 * @param {Array<NodeOptions>} node - LavaNode ที่จะใช้
	 * @extends EventEmitter
	 */
	public constructor(client: any, node: NodeOptions[]) {
		super();

		this.client = client;
		this.nodeOptions = node;
		this.shards = client.ws.shards.size;

		this.nodeCollection = new Cache();
		this.playerCollection = new Cache();

		if (!this.nodeOptions || !this.nodeOptions.length)
			throw new Error("[ClientError] ไม่มีโหนดให้!");

		for (let x of this.nodeOptions) {
			if (this.nodeCollection.has(x.host)) continue;

			const newNode = new LavaNode(this, x);
			this.nodeCollection.set(x.host, newNode);
		}

		this.client.on("raw", this.handleStateUpdate.bind(this));
	}

	/**
	 * ส่งคืนโหนดที่มีการใช้ทรัพยากรน้อยที่สุด
	 * @return {LavaNode}
	 */
	public get optimisedNode(): LavaNode {
		const sorted = this.nodeCollection
			.toArray()
			.filter((x) => x.online)
			.sort((a, b) => {
				const loadA = (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100;
				const loadB = (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100;
				return loadB - loadA;
			});
		return sorted[0];
	}

	/**
	 * ส่งข้อมูลไปยัง Discord ผ่าน WebSocket
	 * @param {*} data - แพ็กเก็ตข้อมูลที่จะส่ง
	 */
	public wsSend(data: any): void {
		if (!this.client) return;
		const guild = this.client.guilds.fetch(data.d.guild_id);
		if (this.client.shard) {
			if (this.client.shard.count > 1) {
				this.client.ws.shards.get(this.client.shard.ids[0]).send(data);
			}
		} else if (guild) {
			this.client.ws.shards.get(0).send(data);
		}
	}

	/**
	 * Spawn new LavaNode และเชื่อมต่อกับมัน
	 * @param {NodeOptions} nodeOptions - ตัวเลือกสำหรับโหนดใหม่
	 * @return {LavaNode} node - โหนดใหม่
	 */
	public connect(nodeOptions: NodeOptions): LavaNode {
		if (!nodeOptions || !nodeOptions.host)
			throw new Error("[ClientError] ไม่มีโหนดให้!");

		const newNode = new LavaNode(this, nodeOptions);
		this.nodeCollection.set(nodeOptions.host, newNode);

		return newNode;
	}

	/**
	 * สร้างผู้เล่น LavaOne ใหม่หรือส่งคืนผู้เล่นเก่าหากมีผู้เล่นอยู่
	 * @param {PlayerOptions} options - ตัวเลือกผู้เล่น
	 * @param {QueueOptions} [queueOption] - ตัวเลือกคิว
	 * @return {Player} player -ผู้เล่นใหม่
	 */
	public spawnPlayer(
		options: PlayerOptions,
		queueOption?: QueueOptions
	): Player {
		if (!options.guild)
			throw new TypeError(
				`LavaClient#spawnPlayer() ไม่สามารถดึงข้อมูลได้ PlayerOptions.guild.`
			);
		if (!options.voiceChannel)
			throw new TypeError(
				`LavaClient#spawnPlayer() ไม่สามารถดึงข้อมูลได้ PlayerOptions.voiceChannel.`
			);
		if (!options.textChannel)
			throw new TypeError(
				`LavaClient#spawnPlayer() ไม่สามารถดึงข้อมูลได้ PlayerOptions.textChannel.`
			);

		const oldPlayer = this.playerCollection.get(options.guild.id);
		if (oldPlayer) return oldPlayer;

		return new Player(this, options, queueOption);
	}

	/**
	 * จัดการการอัปเดตสถานะเสียงของ Discord
	 * @param {*} data - แพ็กเก็ตข้อมูลจากความไม่ลงรอยกัน
	 */
	private handleStateUpdate(data: any): void {
		if (!["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(data.t)) return;
		if (data.d.user_id && data.d.user_id !== this.client.user.id) return;

		const player = this.playerCollection.get(data.d.guild_id);
		if (!player) return;
		const voiceState = states.get(data.d.guild_id) || {};

		switch (data.t) {
			case "VOICE_STATE_UPDATE":
				voiceState.op = "voiceUpdate";
				voiceState.sessionId = data.d.session_id;

				if (player.options.voiceChannel.id !== data.d.channel_id) {
					const newChannel = this.client.channels.fetch(
						data.d.channel_id
					) as VoiceChannel;
					if (newChannel) player.options.voiceChannel = newChannel;
				}
				break;

			case "VOICE_SERVER_UPDATE":
				voiceState.guildId = data.d.guild_id;
				voiceState.event = data.d;
				break;
		}

		states.set(data.d.guild_id, voiceState);
		const { op, guildId, sessionId, event } = voiceState;

		if (op && guildId && sessionId && event) {
			player.node
				.wsSend(voiceState)
				.then(() => states.set(guildId, {}))
				.catch((err) => {
					if (err) throw new Error(err);
				});
		}
	}
}
