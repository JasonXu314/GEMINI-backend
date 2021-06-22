import { Logger, Module } from '@nestjs/common';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { AppController } from './app.controller';
import { FilesService } from './app.service';

@Module({
	imports: [NestjsFormDataModule],
	controllers: [AppController],
	providers: [FilesService, Logger]
})
export class AppModule {}
