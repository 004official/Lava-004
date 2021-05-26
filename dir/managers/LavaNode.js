"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LavaNode = void 0;
const ws_1 = __importDefault(require("ws"));
class LavaNode {
    /**
     * สร้างอินสแตนซ์คลาส LavaNode ใหม่
     * @param {LavaClient} lavaOne - LavaClient.
     * @param {NodeOptions} options - ตัวเลือก LavaNode
     */
    constructor(lavaOne, options) {
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
    get systemStats() {
        return this.stats;
    }
    /**
     * สถานะการเชื่อมต่อของโหนด
     * @return {Boolean}
     * @readonly
     */
    get online() {
        if (!this.con)
            return false;
        return this.con.readyState === ws_1.default.OPEN;
    }
    /**
     * สร้างการเชื่อมต่อโหนด websocket
     */
    connect() {
        const headers = {
            Authorization: this.options.password,
            "Num-Shards": this.lavaOne.shards,
            "User-Id": this.lavaOne.client.user.id,
        };
        this.con = new ws_1.default(`ws://${this.options.host}:${this.options.port}/`, { headers });
        this.con.on("open", this.onConnect.bind(this));
        this.con.on("error", this.onError.bind(this));
        this.con.on("close", this.onClose.bind(this));
        this.con.on("message", this.handleResponse.bind(this));
    }
    /**
     * จัดการการเชื่อมต่อที่ประสบความสำเร็จ
     */
    onConnect() {
        clearTimeout(this.reconnectModule);
        this.lavaOne.emit("nodeSuccess", this);
    }
    /**
     * จัดการเหตุการณ์การเชื่อมต่อแบบปิด
     * @param {Number} code - รหัสข้อผิดพลาด
     * @param {String} reason - เหตุผล
     */
    onClose(code, reason) {
        this.lavaOne.emit("nodeClose", this, new Error(`ปิดการเชื่อมต่อด้วยรหัส : ${code} และ เหตุผล: ${reason}`));
        if (code !== 1000 || reason !== "destroy")
            this.reconnect();
    }
    /**
     * จัดการข้อผิดพลาดในการเชื่อมต่อ
     * @param {Error} error - ข้อความแสดงข้อผิดพลาด
     */
    onError(error) {
        if (!error)
            return;
        this.lavaOne.emit("nodeError", this, error);
        this.reconnect();
    }
    /**
     * เชื่อมต่อกับโหนดอีกครั้งหากไม่ได้เชื่อมต่อ
     */
    reconnect() {
        this.reconnectModule = setTimeout(() => {
            if (this.conStatus.attempts >= this.conStatus.doRetry) {
                this.lavaOne.emit("nodeError", this, new Error(`ไม่สามารถเชื่อมต่อโหนดหลังจากพยายาม ${this.conStatus.attempts}!`));
                return this.kill();
            }
            this.con.removeAllListeners();
            this.con = null;
            this.lavaOne.emit("nodeReconnect", this);
            this.connect();
            this.conStatus.attempts++;
        }, 3e4);
    }
    /**
     * ทำลายโหนด
     */
    kill() {
        if (!this.online)
            return;
        this.con.close(1000, "destroy");
        this.con.removeAllListeners();
        this.con = null;
        this.lavaOne.nodeCollection.delete(this.options.host);
    }
    /**
     * จัดการข้อมูลขาเข้าจากโหนด
     */
    handleResponse(data) {
        const msg = JSON.parse(data.toString());
        const { op, type, code, guildId, state } = msg;
        if (!op)
            return;
        if (op !== "event") {
            // จัดการข้อความเหตุการณ์ที่ไม่ใช่การติดตาม
            switch (op) {
                case "stats":
                    this.stats = Object.assign({}, msg);
                    delete this.stats.op;
                    break;
                case "playerUpdate":
                    const player = this.lavaOne.playerCollection.get(guildId);
                    if (player)
                        player.position = state.position || 0;
                    break;
            }
        }
        else if (op === "event") {
            const player = this.lavaOne.playerCollection.get(guildId);
            if (!player)
                return;
            player.playState = false;
            const track = player.queue.first;
            // จัดการติดตามข้อความเหตุการณ์
            switch (type) {
                case "TrackStartEvent":
                    player.playState = true;
                    this.lavaOne.emit("trackPlay", track, player);
                    break;
                case "TrackEndEvent":
                    if (!track)
                        return;
                    if (track && player.queue.repeatTrack) {
                        player.play();
                    }
                    else if (track && player.queue.repeatQueue) {
                        const toAdd = player.queue.remove();
                        if (toAdd)
                            player.queue.add(toAdd);
                        player.play();
                    }
                    else if (track && player.queue.size > 1) {
                        player.queue.remove();
                        player.play();
                    }
                    else if (track && player.queue.size === 1) {
                        player.queue.remove();
                        this.lavaOne.emit("queueOver", player);
                    }
                    break;
                case "TrackStuckEvent":
                    if (!track)
                        return;
                    player.queue.remove();
                    if (player.queue.skipOnError)
                        player.play();
                    this.lavaOne.emit("trackStuck", track, player, msg);
                    break;
                case "TrackExceptionEvent":
                    if (!track)
                        return;
                    player.queue.remove();
                    if (player.queue.skipOnError)
                        player.play();
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
        }
        else {
            // หากข้อความมี OP. ที่ไม่รู้จัก
            this.lavaOne.emit("nodeError", this, new Error(`ข้อผิดพลาด / เหตุการณ์ที่ไม่รู้จักกับ op : ${op} และข้อมูล ${msg}!`));
        }
    }
    /**
     * ส่งข้อมูลไปยังโหนด websocket
     * @param {Object} data - แพ็กเก็ตข้อมูล
     * @returns {Promise<Boolean>}
     */
    wsSend(data) {
        return new Promise((res, rej) => {
            if (!this.online)
                res(false);
            const formattedData = JSON.stringify(data);
            if (!formattedData || !formattedData.startsWith("{"))
                rej(`ข้อมูลไม่อยู่ในรูปแบบที่เหมาะสม`);
            this.con.send(formattedData, (err) => {
                err ? rej(err) : res(true);
            });
        });
    }
}
exports.LavaNode = LavaNode;
