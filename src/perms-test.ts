import dotenv from 'dotenv';
import { CategoryChannel, Client } from 'eris';
import { Permissions } from 'slash-create';
import path from 'path';

import { pickPhonetic } from './util/fakerExtended';
import { managerPermissions, observerPermissions, playerPermissions } from './util/permissions';

let dotenvPath = path.join(process.cwd(), '.env');
if (path.parse(process.cwd()).name === 'dist') dotenvPath = path.join(process.cwd(), '..', '.env');

dotenv.config({ path: dotenvPath });

const client = new Client(process.env.DISCORD_BOT_TOKEN);

client.connect();

client.on('ready', async () => {
  const guild = client.guilds.get('684013196700418048');

  const category = guild.channels.get('924737174933495900') as CategoryChannel;

  const permissions = category.permissionOverwrites;

  // const parentPermissions = (client.getChannel(parentID) as CategoryChannel).permissionOverwrites.values();

  // console.log([...permissions.values()]);

  const clientCategoryPermissions = new Permissions(category.permissionsOf(client.user.id).allow);

  console.log(clientCategoryPermissions.bitfield, clientCategoryPermissions.toArray().sort());

  permissions.map(({ allow, deny, id, json }) => {
    console.log(id, { allow, deny }, clientCategoryPermissions.missing(allow), json);
  });

  // return client.disconnect({ reconnect: false });
  const channel = await client.createChannel(guild.id, `${pickPhonetic()}-${pickPhonetic()}`, 0, {
    parentID: category.id,
    permissionOverwrites: [
      ...permissions.map(({ id, type }) => ({ id, type, allow: observerPermissions.bitfield, deny: 0 })),
      { type: 1, id: client.user.id, allow: managerPermissions.bitfield, deny: 0 },
      { type: 1, id: '133659993768591360', allow: playerPermissions.bitfield, deny: 0 },
      { type: 0, id: guild.id, allow: 0, deny: Permissions.FLAGS.VIEW_CHANNEL }
    ]
  });

  await client.editChannelPermission(
    channel.id,
    '133659993768591360',
    Permissions.FLAGS.VIEW_CHANNEL,
    0,
    1,
    'Game host test'
  );

  console.log(`Created channel ${channel.name} (${channel.id}) with overwrites:`, [
    ...channel.permissionOverwrites.values()
  ]);

  client.disconnect({ reconnect: false });
});
