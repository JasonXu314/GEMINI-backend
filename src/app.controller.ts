import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Param, Post, Response } from '@nestjs/common';
import { ServerResponse } from 'http';
import { FormDataRequest } from 'nestjs-form-data';
import { Readable } from 'stream';
import { FilesService } from './app.service';
import { CreateModelDto } from './create-model.dto';

// Don't allow file requests other than these
const allowedExtensions: string[] = ['struct', 'epi', 'gref'];

/** The main controller for the app */
@Controller()
export class AppController {
	/** Logger module */
	private readonly logger = new Logger('App');

	constructor(private readonly filesService: FilesService) {}

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
		if (!(await this.filesService.modelExists(struct.originalName))) {
			const viewRegion = JSON.parse(body.viewRegion) as ViewRegion;
			const structStream = Readable.from(struct.buffer);
			const epiDataStream = Readable.from(epiData.buffer);
			const refGenesStream = Readable.from(refGenes.buffer);
			const flagsVisible = body.flagsVisible;
			const arcsVisible = body.arcsVisible;

			const res = await this.filesService.saveModel(
				struct.originalName,
				{ structure: structStream, epiData: epiDataStream, refGenes: refGenesStream },
				{ viewRegion, flagsVisible, arcsVisible }
			);
			return res;
		} else {
			throw new BadRequestException('Model of that name already exists!');
		}
	}

	/** Route to get model data */
	@Get('/models/:id')
	async getModel(@Param('id') id: string): Promise<ModelFile> {
		const metadata = await this.filesService.getMetadataById(id);
		if (!metadata) {
			throw new NotFoundException(`Model with id ${id} does not exist`);
		}
		return metadata;
	}

	/** Gets a file, calls service to fetch file from db */
	@Get('/:file')
	async getFile(@Param('file') file: string, @Response() res: ServerResponse): Promise<void> {
		this.logger.log(`Received request for file ${file}`);
		const tokenizedFile = file.split('.');
		const ext = tokenizedFile[tokenizedFile.length - 1];
		if (!allowedExtensions.includes(ext)) {
			res.writeHead(400, 'Only requests for struct, epi, gref files are allowed').end();
			return;
		}
		if (!(await this.filesService.fileExists(file))) {
			throw new NotFoundException(`File with name ${file} does not exist`);
		}
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
		this.filesService.getFile(file).pipe(res);
	}
}
