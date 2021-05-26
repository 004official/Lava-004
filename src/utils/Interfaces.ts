import { Guild, VoiceChannel, TextChannel, User } from "discord.js";

/**
 * อินเทอร์เฟซการติดตาม
 */
export interface Track {
	/**
	 * แทร็กที่เข้ารหัส 64 Bit
	 */
	trackString: string;
	/**
	 * ชื่อเพลง
	 */
	title: string;
	/**
	 * รหัส youtube ของเพลง
	 */
	identifier: string;
	/**
	 * ชื่อช่องของเพลง
	 */
	author: string;
	/**
	 * ระยะเวลาของเพลง
	 */
	length: number;
	/**
	 * ไม่ว่าเพลงจะเป็นสตรีม
	 */
	isStream: boolean;
	/**
	 * ลิงค์ของวิดีโอ
	 */
	uri: string;
	/**
	 * ผู้ใช้ขอเพลง
	 */
	user: User;
	/**
	 * ภาพขนาดย่อของวิดีโอ youtube
	 */
	thumbnail: {
		default: string;
		medium: string;
		high: string;
		standard: string;
		max: string;
	};
}

/**
 * อินเทอร์เฟซของเพลย์ลิสต์
 */
export interface Playlist {
	/**
	 * ชื่อของเพลย์ลิสต์
	 */
	name: string;
	/**
	 * จำนวนแทร็กทั้งหมดในเพลย์ลิสต์
	 */
	trackCount: number;
	/**
	 * ระยะเวลาทั้งหมดของเพลย์ลิสต์
	 */
	duration: number;
	/**
	 * แทร็กในรายการเพลง
	 */
	tracks: Array<Track>;
}

/**
 * ตัวเลือกสำหรับโหนด
 */
export interface NodeOptions {
	/**
	 * IP ของโฮสต์
	 */
	host: string;
	/**
	 * พอร์ตสำหรับโหนด
	 */
	port: number;
	/**
	 * รหัสผ่านการอนุญาต
	 */
	password: string;
	/**
	 * จำนวนครั้งในการลองใหม่เมื่อเกิดข้อผิดพลาดในการเชื่อมต่อ
	 */
	retries?: number;
}

/**
 * ตัวเลือกสำหรับผู้เล่น
 */
export interface PlayerOptions {
	/**
	 * กิลด์ที่ผู้เล่นเชื่อมต่ออยู่
	 */
	guild: Guild;
	/**
	 * ช่องเสียงสำหรับผู้เล่น
	 */
	voiceChannel: VoiceChannel;
	/**
	 * ช่องข้อความที่ผู้เล่นรับฟัง
	 */
	textChannel: TextChannel;
	/**
	 * ตั้งค่าระดับเสียงของผู้เล่นเมื่อเข้าร่วม
	 */
	volume?: number;
	/**
	 * ไม่ว่าจะทำให้บอทหูหนวกเมื่อเข้าร่วม
	 */
	deafen?: boolean;
}

/**
 * The options for the queue
 */
export interface QueueOptions {
	/**
	 * ว่าจะเล่นเพลงปัจจุบันซ้ำหรือไม่
	 */
	repeatTrack?: boolean;
	/**
	 * ไม่ว่าจะซ้ำคิว
	 */
	repeatQueue?: boolean;
	/**
	 * ไม่ว่าจะข้ามเพลงเนื่องจากข้อผิดพลาดในการติดตาม
	 */
	skipOnError?: boolean;
}

/**
 * อินเทอร์เฟซ Node stats
 */
export interface NodeStats {
	/**
	 *จำนวนผู้เล่นที่กำลังเล่นเพลง
	 */
	playingPlayers: number;
	/**
	 * อินเทอร์เฟซ Node memory stat
	 */
	memory: {
		/**
		 * หน่วยความจำสำรอง
		 */
		reservable: number;
		/**
		 * หน่วยความจำที่ใช้ในปัจจุบัน
		 */
		used: number;
		/**
		 * หน่วยความจำที่เหลือ
		 */
		free: number;
		/**
		 * หน่วยความจำที่จัดสรร
		 */
		allocated: number;
	};
	/**
	 * จำนวนผู้เล่นที่เปิดเพลง
	 */
	players: number;
	/**
	 * อินเทอร์เฟซ Node cpu stat
	 */
	cpu: {
		/**
		 * จำนวนแกน CPU ที่มี
		 */
		cores: number;
		/**
		 * ระบบโหลดบนแกน CPU
		 */
		systemLoad: number;
		/**
		 * โหลดบนแกน CPU โดย LavaLink
		 */
		lavalinkLoad: number;
	};
	/**
	 * สถานะการออนไลน์ของโหนด
	 */
	uptime: number;
}
