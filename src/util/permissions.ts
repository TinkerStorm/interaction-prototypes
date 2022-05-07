import { Permissions } from "slash-create";

//const allChannelPermissions = new Permissions([
//  'CREATE_INSTANT_INVITE',
//  'MANAGE_CHANNELS',
//  'ADD_REACTIONS',
//  'VIEW_CHANNEL',
//  'SEND_MESSAGES',
//  'MANAGE_MESSAGES',
//  'EMBED_LINKS',
//  'ATTACH_FILES',
//  'READ_MESSAGE_HISTORY',
//  'MENTION_EVERYONE',
//  'USE_EXTERNAL_EMOJIS',
//  // 'CONNECT',
//  // 'SPEAK'
//])

export const spectatorOverwrite = new Permissions([
  'VIEW_CHANNEL',
  'READ_MESSAGE_HISTORY'
]);

export const playerPermissions = new Permissions([
  spectatorOverwrite,
  'SEND_MESSAGES',
  'SEND_MESSAGES_IN_THREADS',
  'USE_EXTERNAL_EMOJIS',
]);

export const observerPermissions = new Permissions([
  spectatorOverwrite,
  'MANAGE_THREADS'
]);

export const managerPermissions = new Permissions([
  playerPermissions,
  observerPermissions,
  'MANAGE_CHANNELS',
  'CREATE_INSTANT_INVITE',
  'EMBED_LINKS',
  'ADD_REACTIONS'
]);
