import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Param, Post, Response } from '@nestjs/common';
import { ServerResponse } from 'http';
import { FormDataRequest } from 'nestjs-form-data';
import { Readable } from 'stream';
import { FilesService } from './app.service';
import { CreateModelDto } from './create-model.dto';

const allowedExtensions: string[] = ['gltf', 'bin', 'png', 'struct', 'epi', 'gref'];

@Controller()
export class AppController {
	private readonly logger = new Logger('App');

	constructor(private readonly filesService: FilesService) {}

	@Post('/wakeup')
	wakeup() {}

	@Post('/save')
	@FormDataRequest({ limits: { fieldSize: 4e9 } })
	async saveModel(@Body() body: CreateModelDto): Promise<SaveFilesResponse> {
		const gltf = body.gltf;
		const bin = body.bin;
		const struct = body.structure;
		const epiData = body.epiData;
		const refGenes = body.refGenes;
		const textureFiles = body.textures;
		if (!(await this.filesService.modelExists(gltf.originalName))) {
			const gltfStream = Readable.from(gltf.buffer);
			const binStream = Readable.from(bin.buffer);
			const textures = textureFiles.map((file) => ({ stream: Readable.from(file.buffer), name: file.originalName }));
			const viewRegion = JSON.parse(body.viewRegion) as ViewRegion;
			const structStream = Readable.from(struct.buffer);
			const epiDataStream = Readable.from(epiData.buffer);
			const refGenesStream = Readable.from(refGenes.buffer);
			const flagsVisible = body.flagsVisible;
			const arcsVisible = body.arcsVisible;

			return await this.filesService.saveModel(
				gltf.originalName,
				{ gltf: gltfStream, bin: binStream, structure: structStream, epiData: epiDataStream, refGenes: refGenesStream, textures },
				{ viewRegion, flagsVisible, arcsVisible }
			);
		} else {
			throw new BadRequestException('Model of that name already exists!');
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
			res.writeHead(400, 'Only requests for gltf, bin, png, struct, epi, gref files are allowed').end();
			return;
		}
		if (ext === 'png') {
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		} else {
			const modelName = file.split('.').slice(0, -1).join('.');
			if (!(await this.filesService.modelExists(modelName))) {
				throw new NotFoundException(`Model with name ${modelName} does not exist`);
			}
			res.setHeader('Content-Type', ext === 'gltf' ? 'model/gltf+json' : 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		}
	}
}
