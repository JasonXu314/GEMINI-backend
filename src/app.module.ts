import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FilesService } from './app.service';

@Module({
	imports: [],
	controllers: [AppController],
	providers: [FilesService, Logger]
})
export class AppModule {}
