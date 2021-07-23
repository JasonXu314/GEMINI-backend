// Boilerplate for nest
import { Logger, Module } from '@nestjs/common';
import { NestjsFormDataModule } from 'nestjs-form-data';
import { AppController } from './app.controller';
import { DBService } from './db.service';
import { RTService } from './rt.service';

@Module({
	imports: [NestjsFormDataModule],
	controllers: [AppController],
	providers: [DBService, Logger, AppController, RTService]
})
export class AppModule {}
