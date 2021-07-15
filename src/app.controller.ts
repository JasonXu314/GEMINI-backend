import { BadRequestException, Body, Controller, Delete, Get, Logger, NotFoundException, Param, Patch, Post, Query, Response } from '@nestjs/common';
import { ServerResponse } from 'http';
import { FormDataRequest } from 'nestjs-form-data';
import { Readable } from 'stream';
import { FilesService } from './app.service';
import { CreateModelDto } from './create-model.dto';

// Don't allow file requests other than these
const allowedExtensions: string[] = ['struct', 'epi', 'gref', 'png'];

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
			const annotations = JSON.parse(body.annotations) as RawAnnotation[];
			const structStream = Readable.from(struct.buffer);
			const epiDataStream = Readable.from(epiData.buffer);
			const refGenesStream = Readable.from(refGenes.buffer);
			const flagsVisible = body.flagsVisible;
			const arcsVisible = body.arcsVisible;

			const res = await this.filesService.saveModel(
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
		return this.filesService.getAllModels();
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

	@Get('/history')
	async getHistory(@Query('id') id: string): Promise<Sort[]> {
		return this.filesService.getSorts(id);
	}

	@Post('/history')
	async pushHist(@Body('sort') sort: Sort, @Body('id') id: string): Promise<Sort[]> {
		return this.filesService.addSort(id, sort);
	}

	@Patch('/history')
	async renameSort(@Body('id') modelId: string, @Body('_id') sortId: string, @Body('name') name: string): Promise<Sort[]> {
		return this.filesService.renameSort(modelId, sortId, name);
	}

	@Delete('/history')
	async deleteSort(@Body('id') modelId: string, @Body('_id') sortId: string): Promise<Sort[]> {
		return this.filesService.deleteSort(modelId, sortId);
	}

	@Get('/annotations')
	async getAnnotations(@Query('id') modelId: string): Promise<RawAnnotation[]> {
		return this.filesService.getAnnotations(modelId);
	}

	@Post('/annotations')
	async makeAnnotation(@Body('id') modelId: string, @Body('annotation') annotation: RawAnnotation): Promise<RawAnnotation[]> {
		return this.filesService.addAnnotation(modelId, annotation);
	}

	@Delete('/annotations')
	async delAnnotation(@Body('id') modelId: string, @Body('name') name: string): Promise<RawAnnotation[]> {
		return this.filesService.removeAnnotation(modelId, name);
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
		if (!(await this.filesService.fileExists(file))) {
			throw new NotFoundException(`File with name ${file} does not exist`);
		}
		if (ext === 'png') {
			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		} else {
			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=utf-8"${file}`);
			this.filesService.getFile(file).pipe(res);
		}
	}
}
