import dotenv from 'dotenv';
import { SlashCreator, GatewayServer } from 'slash-create';
import { Client } from 'eris';
import path from 'path';
import CatLoggr from 'cat-loggr/ts';
import { registerComponents as registerLobbyComponents } from './util/game';
import { registerComponents } from './components';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

const logger = new CatLoggr().setLevel(process.env.COMMANDS_DEBUG === 'true' ? 'debug' : 'info');
const client = new Client(process.env.DISCORD_BOT_TOKEN, {
  intents: ['guilds', 'guildMessages']
});
const creator = new SlashCreator({
  client,
  applicationID: process.env.DISCORD_APP_ID,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  token: process.env.DISCORD_BOT_TOKEN,
  serverPort: 8020
});

creator.on('debug', (message) => logger.log(message));
creator.on('warn', (message) => logger.warn(message));
creator.on('error', (error) => logger.error(error));
creator.on('synced', () => logger.info('Commands synced!'));
creator.on('commandRun', (command, _, ctx) =>
  logger.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran command ${command.commandName}`)
);
creator.on('commandRegister', (command) => logger.info(`Registered command ${command.commandName}`));
creator.on('commandError', (command, error) => logger.error(`Command ${command.commandName}:`, error));

creator
  .withServer(
    new GatewayServer((handler) => {
      client.on('rawWS', (packet: any) => {
        if (packet.t === 'INTERACTION_CREATE') {
          handler(packet.d);
        }
      });
    })
  )
  // .syncCommands()
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.connect();

registerComponents(creator);
registerLobbyComponents(client, creator);

// creator.startServer();
client.connect();
