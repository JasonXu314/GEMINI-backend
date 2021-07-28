import { BadRequestException, Body, Controller, Delete, Get, Header, Logger, NotFoundException, Param, Patch, Post, Query, Response } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { ServerResponse } from 'http';
import { FormDataRequest } from 'nestjs-form-data';
import { Readable } from 'stream';
import { default as Socket, Server } from 'ws';
import { CreateModelDto } from './create-model.dto';
import { DBService } from './db.service';
import { RTService } from './rt.service';

// Don't allow file requests other than these
const allowedExtensions: string[] = ['struct', 'epi', 'gref', 'png'];

/** The main controller for the app */
@Controller()
@WebSocketGateway({ serveClient: false })
export class AppController implements OnGatewayInit, OnGatewayConnection {
	/** Logger module */
	private readonly logger = new Logger('App');
	@WebSocketServer() private readonly server: Server;

	constructor(private readonly dbService: DBService, private readonly rtService: RTService) {}

	/** A noop route that allows the frontend to wake up the heroku app, mitigates cold-start time somewhat */
	@Post('/wakeup')
	wakeup() {
		this.logger.log('Received Wakeup Call');
	}

	/**
	 * Route to handle file uploads, calls service to save files to db
	 */
	@Post('/save')
	@FormDataRequest({ limits: { fieldSize: 4e9 } })
	async saveModel(@Body() body: CreateModelDto): Promise<SaveFilesResponse> {
		const struct = body.structure;
		const epiData = body.epiData;
		const refGenes = body.refGenes;
		if (!(await this.dbService.modelExists(struct.originalName))) {
			const viewRegion = JSON.parse(body.viewRegion) as ViewRegion;
			const annotations = JSON.parse(body.annotations) as RawAnnotation[];
			const structStream = Readable.from(struct.buffer);
			const epiDataStream = Readable.from(epiData.buffer);
			const refGenesStream = Readable.from(refGenes.buffer);
			const flagsVisible = body.flagsVisible;
			const arcsVisible = body.arcsVisible;

			const res = await this.dbService.saveModel(
				struct.originalName,
				{ structure: structStream, epiData: epiDataStream, refGenes: refGenesStream },
				{ viewRegion, flagsVisible, arcsVisible },
				annotations
			);
			return res;
		} else {
			throw new BadRequestException('Model of that name already exists!');
		}
	}

	@Get('/models')
	async getAllModels(): Promise<ModelFile[]> {
		return this.dbService.getAllModels();
	}

	/** Route to get model data */
	@Get('/models/:id')
	async getModel(@Param('id') id: string, @Query('nosocket') noSocket: boolean): Promise<ModelFile & { socketId: string | null }> {
		const metadata = await this.dbService.getMetadataById(id);
		if (!metadata) {
			throw new NotFoundException(`Model with id ${id} does not exist`);
		}

		if (!noSocket) {
			const socketId = randomUUID();

			this.rtService.assignId(socketId, id);

			return { ...metadata, socketId };
		}

		return { ...metadata, socketId: null };
	}

	@Get('/history')
	async getHistory(@Query('id') id: string): Promise<Sort[]> {
		return this.dbService.getSorts(id);
	}

	@Post('/history')
	async pushHist(@Body('sort') sort: Sort, @Body('id') id: string): Promise<Sort[]> {
		const result = await this.dbService.addSort(id, sort);

		this.rtService.broadcast(id, { type: 'HIST_ADD', newSort: sort });

		return result;
	}

	@Patch('/history')
	async renameSort(@Body('id') modelId: string, @Body('_id') sortId: string, @Body('name') name: string): Promise<Sort[]> {
		const result = await this.dbService.renameSort(modelId, sortId, name);

		this.rtService.broadcast(modelId, { type: 'HIST_EDIT', id: sortId, name });

		return result;
	}

	@Delete('/history')
	async deleteSort(@Body('id') modelId: string, @Body('_id') sortId: string): Promise<Sort[]> {
		const result = await this.dbService.deleteSort(modelId, sortId);

		this.rtService.broadcast(modelId, { type: 'HIST_DEL', id: sortId });

		return result;
	}

	@Get('/annotations')
	async getAnnotations(@Query('id') modelId: string): Promise<RawAnnotation[]> {
		return this.dbService.getAnnotations(modelId);
	}

	@Post('/annotations')
	async makeAnnotation(@Body('id') modelId: string, @Body('annotation') annotation: RawAnnotation): Promise<RawAnnotation[]> {
		const result = await this.dbService.addAnnotation(modelId, annotation);

		this.rtService.broadcast(modelId, { type: 'ANN_ADD', newAnnotation: annotation });

		return result;
	}

	@Delete('/annotations')
	async delAnnotation(@Body('id') modelId: string, @Body('name') name: string): Promise<RawAnnotation[]> {
		const result = await this.dbService.removeAnnotation(modelId, name);

		this.rtService.broadcast(modelId, { type: 'ANN_DEL', mesh: name });

		return result;
	}

	@Get('/views')
	async getViews(@Query('id') id: string): Promise<View[]> {
		return this.dbService.getViews(id);
	}

	@Post('/views')
	async pushView(@Body('view') view: View, @Body('id') id: string): Promise<View[]> {
		const result = await this.dbService.addView(id, view);

		this.rtService.broadcast(id, { type: 'VIEW_ADD', newView: view });

		return result;
	}

	@Patch('/views')
	async renameView(@Body('id') modelId: string, @Body('_id') viewId: string, @Body('name') name: string): Promise<View[]> {
		const result = await this.dbService.renameView(modelId, viewId, name);

		this.rtService.broadcast(modelId, { type: 'VIEW_EDIT', id: viewId, name });

		return result;
	}

	@Delete('/views')
	async deleteViews(@Body('id') modelId: string, @Body('_id') viewId: string): Promise<View[]> {
		const result = await this.dbService.deleteView(modelId, viewId);

		this.rtService.broadcast(modelId, { type: 'VIEW_DEL', id: viewId });

		return result;
	}

	@Get('/sockets')
	@Header('Content-Type', 'text/html')
	getTestPage(): string {
		return `
	<!DOCTYPE html>
	<html>
		<head>
			<title>Socket Test Page</title>
			<style>body { margin: 0; padding: 2em; } h4 { margin: 0; }</style>
		</head>
		<body>
			${[...this.rtService.getRooms().entries()].map(
				([roomId, sockets]) => `<h4>${roomId}</h4>
			<ul>${sockets.map(
				(socket) => `
				<li>${this.rtService.getId(socket)}</li>`
			)}
			</ul>`
			)}
		</body>
	</html>
		`;
	}

	/** Gets a file, calls service to fetch file from db */
	@Get('/:file')
	async getFile(@Param('file') file: string, @Response() res: ServerResponse): Promise<void> {
		this.logger.log(`Received request for file ${file}`);
		const tokenizedFile = file.split('.');
		const ext = tokenizedFile[tokenizedFile.length - 1];
		if (!allowedExtensions.includes(ext)) {
			res.writeHead(400, 'Only requests for struct, epi, gref, and png files are allowed').end();
			return;
		}
		if (!(await this.dbService.fileExists(file))) {
			throw new NotFoundException(`File with name ${file} does not exist`);
		}
		if (ext === 'png') {
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.dbService.getFile(file).pipe(res);
		} else {
			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.dbService.getFile(file).pipe(res);
		}
	}

	// Gateway Methods

	afterInit(): void {
		this.logger.log('Gateway Initialized');
	}

	handleConnection(client: Socket): void {
		this.logger.log(`New connection`);

		client.once('message', (msg: string) => {
			const parsedMsg = JSON.parse(msg) as IncomingSocketMsgs;

			if (parsedMsg.type === 'LINK') {
				try {
					this.rtService.joinRoom(client, parsedMsg.id, parsedMsg.roomId);
					this.logger.log(`Client with id ${this.rtService.getId(client)} linked with room ${this.rtService.getRoomId(client)}`);

					client.once('close', () => {
						const id = this.rtService.getId(client)!;
						const roomId = this.rtService.getRoomId(client)!;
						const liveSession = this.rtService.getLiveSession(roomId);

						this.logger.log(`Client with id ${this.rtService.getId(client)} disconnected from room ${this.rtService.getRoomId(client)}`);
						this.rtService.destroy(client);

						if (liveSession) {
							if (id === liveSession.hostID) {
								this.dbService.closeLive(roomId);
							} else {
								if (id === liveSession.controllerID) {
									liveSession.controllerID = liveSession.hostID;
									this.dbService.transferControl(roomId, liveSession.hostID);
									this.rtService.broadcast(roomId, { type: 'TRANSFER_CONTROL', id: liveSession.hostID });
								}
								this.dbService.removeParticipant(roomId, id);
							}
						}
					});

					client.on('message', (msg: string) => {
						const message = JSON.parse(msg) as IncomingSocketMsgs;

						switch (message.type) {
							case 'START_LIVE': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const { name, camPos, camRot } = message;
								const sessionData = {
									participants: [{ id, name }],
									camPos,
									camRot,
									hostID: id,
									controllerID: id
								};

								try {
									this.rtService.makeLiveSession(roomId, sessionData);
									this.dbService.makeLive(roomId, sessionData);

									this.rtService.broadcast(roomId, { type: 'START_LIVE', data: sessionData });
								} catch (e: unknown) {
									this.logger.error(e);
								}
								break;
							}
							case 'CAM_CHANGE': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id === liveSession.controllerID) {
									const { camPos, camRot } = message;
									liveSession.camPos = camPos;
									liveSession.camRot = camRot;

									this.rtService.broadcast(roomId, { type: 'CAM_CHANGE', camPos, camRot });
									this.dbService.adjustCamera(roomId, camPos, camRot);
								}
								break;
							}
							case 'JOIN_LIVE': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);
								this.logger.log(`Client with id ${id} joined the live session in ${roomId}`);

								if (liveSession) {
									const { name } = message;
									liveSession.participants.push({ id, name });

									this.rtService.broadcast(roomId, { type: 'JOIN_LIVE', id, name });
									this.dbService.addParticipant(roomId, id, name);
								}
								break;
							}
							case 'LEAVE_LIVE': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);
								this.logger.log(`Client with id ${id} left the live session in ${roomId}`);

								if (liveSession) {
									liveSession.participants.splice(
										liveSession.participants.findIndex(({ id: sid }) => sid === id),
										1
									);

									this.rtService.broadcast(roomId, { type: 'LEAVE_LIVE', id });
									this.dbService.removeParticipant(roomId, id);
								}
								break;
							}
							case 'END_LIVE': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id === liveSession.hostID) {
									this.rtService.broadcast(roomId, { type: 'END_LIVE' });
									this.rtService.closeLiveSession(roomId);
									this.dbService.closeLive(roomId);
								}
								break;
							}
							case 'SELECT_MESH': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id === liveSession.controllerID) {
									this.rtService.broadcast(roomId, { type: 'SELECT_MESH', mesh: message.mesh });
								}
								break;
							}
							case 'TRANSFER_CONTROL': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id === liveSession.hostID) {
									this.rtService.broadcast(roomId, { type: 'TRANSFER_CONTROL', id: message.id });
									liveSession.controllerID = message.id;
									this.dbService.transferControl(roomId, message.id);
								}
								break;
							}
							case 'REVERT_CONTROL': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id === liveSession.controllerID) {
									this.rtService.broadcast(roomId, { type: 'TRANSFER_CONTROL', id: liveSession.hostID });
									liveSession.controllerID = liveSession.hostID;
									this.dbService.transferControl(roomId, liveSession.hostID);
								}
								break;
							}
							case 'REQUEST_CONTROL': {
								const id = this.rtService.getId(client)!;
								const roomId = this.rtService.getRoomId(client)!;
								const liveSession = this.rtService.getLiveSession(roomId);

								if (liveSession && id !== liveSession.hostID && id !== liveSession.controllerID) {
									const name = liveSession.participants.find(({ id: sid }) => sid === id)!.name;
									this.rtService
										.getSocket(liveSession.hostID)!
										.send(JSON.stringify({ type: 'REQUEST_CONTROL', id, name } as OutboundRequestControlMsg));
								}
								break;
							}
						}
					});
				} catch (e: unknown) {
					this.logger.error(e);
				}
			}
		});
	}
}
