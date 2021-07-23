import { Injectable, Logger } from '@nestjs/common';
import { default as Socket } from 'ws';

@Injectable()
export class RTService {
	private readonly logger: Logger;
	private readonly roomMap: Map<string, Socket[]>;
	private readonly socketMap: Map<string, Socket>;
	private readonly socketIdMap: Map<Socket, string>;
	private readonly socketRoomMap: Map<Socket, string>;
	private readonly liveSessions: Map<string, LiveSessionData>;
	private readonly assignedIds: Map<string, AssignedId>;

	constructor() {
		this.logger = new Logger('RealTime Service');
		this.roomMap = new Map();
		this.socketMap = new Map();
		this.assignedIds = new Map();
		this.socketIdMap = new Map();
		this.socketRoomMap = new Map();
		this.liveSessions = new Map();
	}

	public assignId(id: string, roomId: string): void {
		const expiration = setTimeout(() => {
			this.assignedIds.delete(id);
		}, 10000);

		this.assignedIds.set(id, { roomId, expiration, id });
	}

	public joinRoom(socket: Socket, socketId: string, roomId: string): void {
		if (this.assignedIds.has(socketId) && this.assignedIds.get(socketId)!.roomId === roomId) {
			if (!this.roomMap.has(roomId)) {
				this.roomMap.set(roomId, []);
			}

			const room = this.roomMap.get(roomId)!;

			room.push(socket);
			this.socketMap.set(socketId, socket);
			this.socketIdMap.set(socket, socketId);
			this.socketRoomMap.set(socket, roomId);

			clearInterval(this.assignedIds.get(socketId)!.expiration);
			this.assignedIds.delete(socketId);
		} else {
			throw new Error(`Socket id ${socketId} is not assigned to room ${roomId}`);
		}
	}

	public destroy(socket: Socket): void {
		const socketId = this.socketIdMap.get(socket)!;
		const roomId = this.socketRoomMap.get(socket)!;

		this.socketIdMap.delete(socket);
		this.socketRoomMap.delete(socket);
		this.socketMap.delete(socketId);

		const room = this.roomMap.get(roomId)!;
		room.splice(room.indexOf(socket), 1);

		const liveSession = this.liveSessions.get(roomId);
		if (liveSession) {
			if (liveSession.hostID === socketId) {
				this.liveSessions.delete(roomId);
				this.broadcast(roomId, { type: 'END_LIVE' });
			} else {
				liveSession.participants = liveSession.participants.filter(({ id }) => id !== socketId);
				this.broadcast(roomId, { type: 'LEAVE_LIVE', id: socketId });
			}
		}

		if (room.length === 0) {
			this.roomMap.delete(roomId);
		}
	}

	public getSocket(id: string): Socket | undefined {
		return this.socketMap.get(id);
	}

	public getId(socket: Socket): string | undefined {
		return this.socketIdMap.get(socket);
	}

	public getRoomId(socket: Socket): string | undefined {
		return this.socketRoomMap.get(socket);
	}

	public getRooms(): Map<string, Socket[]> {
		return this.roomMap;
	}

	public makeLiveSession(roomId: string, data: LiveSessionData): void {
		if (this.liveSessions.has(roomId)) {
			throw new Error(`Live session in room ${roomId} already exists`);
		} else {
			this.liveSessions.set(roomId, data);
		}
	}

	public getLiveSession(roomId: string): LiveSessionData | undefined {
		return this.liveSessions.get(roomId);
	}

	public broadcast(roomId: string, message: OutgoingSocketMsgs): void {
		if (this.roomMap.has(roomId)) {
			const room = this.roomMap.get(roomId)!;

			room.forEach((socket) => {
				socket.send(JSON.stringify(message));
			});
		}
	}
}
