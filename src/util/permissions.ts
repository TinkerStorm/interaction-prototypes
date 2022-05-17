import { Permissions } from 'slash-create';

export const spectatorPermissions = new Permissions(['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']);

export const playerPermissions = new Permissions([
  spectatorPermissions,
  'SEND_MESSAGES',
  'SEND_MESSAGES_IN_THREADS',
  'USE_EXTERNAL_EMOJIS'
]);

export const observerPermissions = new Permissions([spectatorPermissions, 'MANAGE_THREADS']);

export const managerPermissions = new Permissions([
  playerPermissions,
  observerPermissions,
  'MANAGE_CHANNELS',
  'EMBED_LINKS',
  'ADD_REACTIONS'
]);

// all required permissions
export const allChannelPermissions = new Permissions([
  managerPermissions,
  'MANAGE_MESSAGES',
  'MANAGE_ROLES',
  'EMBED_LINKS',
  'READ_MESSAGE_HISTORY',
  'USE_EXTERNAL_EMOJIS'
]);

// all optional permissions
export const allChannelOptionalPermissions = new Permissions([
  allChannelPermissions,
  // General permissions
  'CREATE_INSTANT_INVITE',

  // Text permissions
  'ATTACH_FILES',
  'MENTION_EVERYONE',

  // Voice permissions
  'CONNECT',
  'SPEAK'
]);
