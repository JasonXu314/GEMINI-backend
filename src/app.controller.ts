import { Controller, Get, Header, Logger } from '@nestjs/common';
import { MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppService } from './app.service';

@Controller()
@WebSocketGateway()
export class AppController implements OnGatewayInit {
	private readonly logger = new Logger('App');

	constructor(private readonly service: AppService) {}

	@Get('/gltf/scene.gltf')
	@Header('Content-Type', 'model/gltf+json')
	getGltf(): any {
		this.logger.log('Recieved GET for GLTF');
		return JSON.parse(this.service.getGltf());
	}

	// @Get('/gltf/scene.bin')
	// @Header('Content-Type', 'application/octet-stream')
	// getBin(): any {
	// 	const bytes = this.service.getBin();

	// 	if (!bytes) {
	// 		throw new NotFoundException('No Bin recieved yet!');
	// 	} else {
	// 		// readFileSync(resolve(__dirname, '..', 'testing', 'scene.bin')).toString()

	// 		let binary = '';
	// 		const len = bytes.byteLength;
	// 		for (let i = 0; i < len; i++) {
	// 			binary += String.fromCharCode(bytes[i]);
	// 		}
	// 		this.logger.log(bytes.byteLength);
	// 		this.logger.log(binary.length);
	// 		return binary;
	// 	}
	// }

	@SubscribeMessage('GLTF_EXPORT')
	handleExport(@MessageBody() body: { data: any; bin: number[] }): void {
		this.service.setGltf(JSON.stringify(body.data));
		this.service.setBin(body.bin);
		this.logger.log(body.bin.length);
		writeFileSync(resolve(__dirname, '..', 'testing', 'scene.bin'), Buffer.from(Uint8Array.from(body.bin).buffer));
		writeFileSync(resolve(__dirname, '..', 'static', 'gltf', 'scene.bin'), Buffer.from(Uint8Array.from(body.bin).buffer));
		writeFileSync(resolve(__dirname, '..', 'testing', 'scene.gltf'), body.data);
	}

	afterInit(): void {
		this.logger.log('Gateway Initialized');
	}
}
