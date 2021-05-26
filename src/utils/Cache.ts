export class Cache<K, V> extends Map<K, V> {
	/**
	 * สร้างแคชใหม่
	 * @extends Map
	 */
	constructor() {
		super();
	}

	/**
	 * รับรายการแรก
	 * @return {V}
	 */
	public get first(): V {
		return this.values().next().value;
	}

	/**
	 * รับคีย์แรก
	 * @return {K}
	 */
	public get firstKey(): K {
		return this.keys().next().value;
	}

	/**
	 * รับรายการสุดท้าย
	 * @return {V}
	 */
	public get last(): V {
		const arr = this.toArray();
		return arr[arr.length - 1];
	}

	/**
	 * รับรายการสุดท้าย
	 * @return {K}
	 */
	public get lastKey(): K {
		const arr = this.KVArray();
		return arr[arr.length - 1][0];
	}

	/**
	 * รับ n จำนวนรายการจากจุดเริ่มต้นหรือจุดสิ้นสุด
	 * @param {Number} [amount] - จำนวนข้อมูลที่จะดึง
	 * @param {String} position - ไม่ว่าจะรับข้อมูลตั้งแต่เริ่มต้นหรือสิ้นสุด
	 * @return {Array<V>}
	 */
	public getSome(amount: number, position: "start" | "end"): V[] | undefined {
		const arr = this.toArray();
		if (position === "start") {
			return arr.slice(amount);
		} else if (position === "end") {
			return arr.slice(-amount);
		}
	}

	/**
	 * แปลงค่าแคชทั้งหมดเป็นอาร์เรย์
	 * @return {Array<V>}
	 */
	public toArray(): V[] {
		return [...this.values()];
	}

	/**
	 * แปลงแคชเป็นอาร์เรย์ของคู่ [K, V]
	 * @return {Array<Array<K, V>>}
	 */
	public KVArray(): [K, V][] {
		return [...this.entries()];
	}

	/**
	 * อนุญาตให้คุณใช้ Array.map() บน Cache
	 * @param {Function} func - ฟังก์ชั่นในการดำเนินการกับแต่ละองค์ประกอบ
	 * @return {Array<T>}
	 */
	public map<T>(func: (value: V, key: K) => T): T[] {
		const mapIter = this.entries();
		return Array.from(
			{ length: this.size },
			(): T => {
				const [key, val] = mapIter.next().value;
				return func(val, key);
			}
		);
	}
}
