import { Player } from "./Player";
import { QueueOptions, Track } from "../utils/Interfaces";
import { Cache } from "../utils/Cache";

export class Queue extends Cache<number, Track> {
	public readonly player: Player;
	/**
	 * ว่าจะเล่นเพลงปัจจุบันซ้ำหรือไม่
	 */
	public repeatTrack: boolean;
	/**
	 * ไม่ว่าจะซ้ำคิว
	 */
	public repeatQueue: boolean;
	/**
	 * ไม่ว่าจะข้ามเพลงเนื่องจากข้อผิดพลาดในการติดตาม
	 */
	public skipOnError: boolean;

	/**
	 * สร้างคิวใหม่
	 * @param {Player} player - ผู้เล่นที่อยู่ในคิวนี้
	 * @param {QueueOptions} [options] - ตัวเลือกสำหรับคิว
	 * @extends Cache
	 */
	constructor(player: Player, options: QueueOptions = {}) {
		super();
		this.player = player;

		this.repeatTrack = options.repeatTrack || false;
		this.repeatQueue = options.repeatQueue || false;
		this.skipOnError = options.skipOnError || false;
	}

	/**
	 * รับระยะเวลาทั้งหมดของคิวปัจจุบันของคุณ
	 * @return {Number}
	 */
	public get duration(): number {
		return this.map((x) => x.length).reduce((acc, val) => acc + val, 0);
	}

	/**
	 * ไม่ว่าคิวจะว่างหรือไม่
	 * @return {Boolean}
	 */
	public get empty(): boolean {
		return !this.size;
	}

	/**
	 * สลับคุณสมบัติการเล่นซ้ำของ แทร็ก หรือ คิว (ไม่มีพารามิเตอร์ปิดใช้งานทั้งสองอย่าง)
	 * @param {"track" | "playlist"} [type] - ไม่ว่าจะทำซ้ำ แทร็ก หรือ คิว
	 * @return {Boolean} state - สถานะการทำซ้ำใหม่
	 */
	public toggleRepeat(type?: "track" | "queue"): boolean {
		if (type === "track") {
			this.repeatTrack = true;
			this.repeatQueue = false;
			return this.repeatTrack;
		} else if (type === "queue") {
			this.repeatQueue = true;
			this.repeatTrack = false;
			return this.repeatQueue;
		} else {
			this.repeatQueue = false;
			this.repeatTrack = false;
			return false;
		}
	}

	/**
	 * เพิ่มแทร็กหรือเพลย์ลิสต์ลงในคิว
	 * @param {Track|Array<Track>} data - ข้อมูลแทร็กหรือเพลย์ลิสต์
	 */
	public add(data: Track | Track[]): void {
		if (!data)
			throw new TypeError(
				`Queue#add() อาร์กิวเมนต์ที่ระบุไม่ใช่ประเภท "Track" หรือ "Track[]".`
			);

		if (Array.isArray(data)) {
			for (let i = 0; i < data.length; i++) {
				this.set((this.size < 1 ? 0 : this.lastKey) + 1, data[i]);
			}
		} else {
			this.set((this.size < 1 ? 0 : this.lastKey) + 1, data);
		}
	}

	/**
	 * ลบแทร็กเดียวออกจากคิว
	 * @param {Number} [pos=0] - ตำแหน่งของแทร็ก
	 * @return {Track|undefined} track - แทร็กที่ถูกลบออก
	 */
	public remove(pos?: number): Track | undefined {
		const track = this.KVArray()[pos || 0];
		this.delete(track[0]);
		return track[1];
	}

	/**
	 * ลบแทร็กทั้งหมดในช่วงที่กำหนด
	 * @param {Number} start - คีย์เริ่มต้น
	 * @param {Number} end - คีย์สิ้นสุด
	 * @return {Array<Track>} track - อาร์เรย์ของแทร็ก
	 */
	public wipe(start: number, end: number): Track[] {
		if (!start) throw new RangeError(`Queue#wipe() "start" ไม่มีพารามิเตอร์`);
		if (!end) throw new RangeError(`Queue#wipe() "end" ไม่มีพารามิเตอร์`);
		if (start >= end)
			throw new RangeError(
				`Queue#wipe() พารามิเตอร์เริ่มต้นต้องมีความยาวน้อยกว่าจุดสิ้นสุด`
			);
		if (start >= this.size)
			throw new RangeError(
				`Queue#wipe() พารามิเตอร์เริ่มต้นต้องมีขนาดเล็กกว่าความยาวคิว`
			);

		const bucket: Track[] = [];
		const trackArr = this.KVArray();
		for (let i = start; i === end; i++) {
			const track = trackArr[i];
			bucket.push(track[1]);
			this.delete(track[0]);
		}
		return bucket;
	}

	/**
	 * ล้างคิวทั้งหมดยกเว้นเพลงปัจจุบัน
	 */
	public clearQueue(): void {
		let curr = this.first;
		this.clear();
		if (curr) this.set(1, curr);
	}

	/**
	 * ย้ายแทร็กไปยังตำแหน่งใหม่
	 * @param {Number} from - ตำแหน่งเดิมของแทร็ก
	 * @param {Number} to - ตำแหน่งใหม่
	 */
	public moveTrack(from: number, to: number): void {
		if (!from)
			throw new RangeError(`Queue#moveTrack() "from" ไม่มีพารามิเตอร์`);
		if (!to) throw new RangeError(`Queue#moveTrack() "to" ไม่มีพารามิเตอร์`);
		if (to > this.size)
			throw new RangeError(
				`Queue#moveTrack()ตำแหน่งใหม่ต้องไม่มากกว่า ${this.size}.`
			);
		if (this.player.playing && (to === 0 || from === 0))
			throw new Error(
				`Queue#moveTrack() ไม่สามารถเปลี่ยนตำแหน่งหรือแทนที่แทร็กที่กำลังเล่นอยู่`
			);

		const arr = [...this.values()];
		const track = arr.splice(from, 1)[0];
		if (!track)
			throw new RangeError(
				`Queue#moveTrack() ไม่พบแทร็กในตำแหน่งที่กำหนด`
			);

		arr.splice(to, 0, track);
		this.clearQueue();
		for (let i = 0; i < arr.length; i++) {
			this.set(i + 1, arr[i]);
		}
	}
}
