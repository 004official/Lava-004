"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
class Cache extends Map {
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
    get first() {
        return this.values().next().value;
    }
    /**
     * รับคีย์แรก
     * @return {K}
     */
    get firstKey() {
        return this.keys().next().value;
    }
    /**
     * รับรายการสุดท้าย
     * @return {V}
     */
    get last() {
        const arr = this.toArray();
        return arr[arr.length - 1];
    }
    /**
     * รับรายการสุดท้าย
     * @return {K}
     */
    get lastKey() {
        const arr = this.KVArray();
        return arr[arr.length - 1][0];
    }
    /**
     * รับ n จำนวนรายการจากจุดเริ่มต้นหรือจุดสิ้นสุด
     * @param {Number} [amount] - จำนวนข้อมูลที่จะดึง
     * @param {String} position - ไม่ว่าจะรับข้อมูลตั้งแต่เริ่มต้นหรือสิ้นสุด
     * @return {Array<V>}
     */
    getSome(amount, position) {
        const arr = this.toArray();
        if (position === "start") {
            return arr.slice(amount);
        }
        else if (position === "end") {
            return arr.slice(-amount);
        }
    }
    /**
     * แปลงค่าแคชทั้งหมดเป็นอาร์เรย์
     * @return {Array<V>}
     */
    toArray() {
        return [...this.values()];
    }
    /**
     * แปลงแคชเป็นอาร์เรย์ของคู่ [K, V]
     * @return {Array<Array<K, V>>}
     */
    KVArray() {
        return [...this.entries()];
    }
    /**
     * อนุญาตให้คุณใช้ Array.map() บน Cache
     * @param {Function} func - ฟังก์ชั่นในการดำเนินการกับแต่ละองค์ประกอบ
     * @return {Array<T>}
     */
    map(func) {
        const mapIter = this.entries();
        return Array.from({ length: this.size }, () => {
            const [key, val] = mapIter.next().value;
            return func(val, key);
        });
    }
}
exports.Cache = Cache;
