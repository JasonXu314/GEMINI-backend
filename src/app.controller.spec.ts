// I haven't written tests yet lol
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { FilesService } from './app.service';

describe('AppController', () => {
	let appController: AppController;

	beforeEach(async () => {
		const app: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [FilesService]
		}).compile();

		appController = app.get<AppController>(AppController);
	});
});
