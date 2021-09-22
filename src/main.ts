import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { config } from 'dotenv';
import { AppModule } from './app.module';

// Load environment variables (not necessary on heroku, but required in local environment)
if (!process.env.PORT) {
	config({ path: './.env' });
} else {
	console.log("Running on Heroku, don't load .env");
}

// Bootstrap the app
async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: [
			'http://localhost:3000',
			'http://localhost:3001',
			'https://gemini-castor.vercel.app',
			'https://gemini-dpuru-debugpoint136.vercel.app',
			'https://gemini-pollux.vercel.app'
		],
		credentials: true
	});
	app.useWebSocketAdapter(new WsAdapter(app));

	console.log(`Binding to ${process.env.PORT || 5000}...`);
	await app.listen(process.env.PORT || 5000);
}

bootstrap();
