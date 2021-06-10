import { BadRequestException, Controller, Get, Logger, NotFoundException, Param, Post, Response, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ServerResponse } from 'http';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';
import { FilesService } from './app.service';

const allowedExtensions: string[] = ['gltf', 'bin', 'png'];

@Controller()
export class AppController {
	private readonly logger = new Logger('App');

	constructor(private readonly filesService: FilesService) {}

	@Post('/wakeup')
	wakeup() {}

	@Post('/save')
	@UseInterceptors(FileFieldsInterceptor([{ name: 'gltf' }, { name: 'bin' }, { name: 'texture' }]))
	async saveModel(@UploadedFiles() files: SaveFilesPost): Promise<SaveFilesResponse> {
		const gltf = files.gltf[0];
		const bin = files.bin[0];
		const texture = files.texture[0];
		if (gltf.mimetype === 'model/gltf+json' && bin.mimetype === 'application/octet-stream') {
			const id = uuid();
			const gltfStream = Readable.from(gltf.buffer);
			const binStream = Readable.from(bin.buffer);
			const textureStream = Readable.from(texture.buffer);

			return this.filesService.saveModel(id, gltf.originalname, texture.originalname, { gltf: gltfStream, bin: binStream, texture: textureStream });
		} else {
			throw new BadRequestException(
				'Either your glTF file or bin file has an incorrect file format; glTF files must be of type model/gltf+json and bin files must be of type application/octet-stream'
			);
		}
	}

	@Get('/models/:id')
	async getModel(@Param('id') id: string): Promise<ModelFile> {
		const metadata = await this.filesService.getMetadataById(id);
		if (!metadata) {
			throw new NotFoundException(`Model with id ${id} does not exist`);
		}
		return metadata;
	}

	@Get('/:file')
	async getFile(@Param('file') file: string, @Response() res: ServerResponse): Promise<void> {
		this.logger.log(`Received request for file ${file}`);
		const tokenizedFile = file.split('.');
		const ext = tokenizedFile[tokenizedFile.length - 1];
		if (!allowedExtensions.includes(ext)) {
			res.writeHead(400, 'Only requests for gltf/bin files are allowed').end();
			return;
		}
		const modelName = file
			.split('.')
			.slice(0, -1)
			.join('.');
		if (ext === 'png') {
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		} else {
			const fileMetadata = await this.filesService.getMetadataByName(modelName);
			if (!fileMetadata) {
				throw new NotFoundException(`Model with name ${modelName} does not exist`);
			}
			res.setHeader('Content-Type', ext === 'gltf' ? 'model/gltf+json' : 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		}
	}
}
